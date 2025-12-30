import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recalcShipmentInvoiceStatus } from "@/lib/financials";
import { logAudit } from "@/lib/audit";
import { getActorFromRequest } from "@/lib/getActor";
enum AuditAction {
  CREATE = "CREATE",
}
enum AuditEntityType {
  INVOICE = "INVOICE",
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" };

function safeDate(input: any): Date {
  const d = input ? new Date(input) : new Date();
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function ymd(d: Date): string {
  // stable YYYY-MM-DD
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/**
 * India Financial Year: Apr -> Mar
 * Example: Dec 2025 => 25/26
 */
function getIndiaFinancialYearLabel(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0-based
  const fyStartYear = m >= 3 ? y : y - 1; // Apr(3) is FY start
  const fyEndYear = fyStartYear + 1;
  return `${String(fyStartYear).slice(-2)}/${String(fyEndYear).slice(-2)}`;
}

function extractSequence(invoiceNumber: string, fyLabel: string): number | null {
  // matches INDO-25/26-001, INDO-25/26-12, etc
  const re = new RegExp(`^INDO-${fyLabel.replace("/", "\\/")}-(\\d+)$`);
  const match = invoiceNumber.match(re);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

async function generateNextInvoiceNumber(issueDate: Date): Promise<string> {
  const fy = getIndiaFinancialYearLabel(issueDate);
  const prefix = `INDO-${fy}-`;

  const existing = await prisma.shipmentInvoice.findMany({
    where: { invoiceNumber: { startsWith: prefix } },
    select: { invoiceNumber: true },
  });

  let max = 0;
  for (const r of existing) {
    const seq = extractSequence(r.invoiceNumber, fy);
    if (seq && seq > max) max = seq;
  }

  const next = max + 1;
  const seqStr = String(next).padStart(3, "0");
  return `${prefix}${seqStr}`;
}

function calcTotals(items: any[], tdsRate: number) {
  let subtotal = 0;
  let totalTax = 0;

  for (const it of items || []) {
    const qty = Number(it.quantity || 0);
    const rate = Number(it.rate || 0);
    const taxRate = Number(it.taxRate || 0);

    const taxable = typeof it.taxableValue === "number" ? Number(it.taxableValue) : qty * rate;

    // always compute GST from taxRate
    const gst = taxable * (taxRate / 100);

    subtotal += taxable;
    totalTax += gst;
  }

  const invoiceTotal = subtotal + totalTax;
  const tdsAmount = tdsRate > 0 ? invoiceTotal * (tdsRate / 100) : 0;
  const net = invoiceTotal - tdsAmount;

  return { subtotal, totalTax, tdsAmount, amount: net };
}

function sumPaid(payments: any[]): number {
  return (payments || []).reduce((a, p) => a + (Number(p?.amount) || 0), 0);
}

function computeStatus(
  baseStatus: string,
  dueDate: Date,
  balance: number
): "DRAFT" | "SENT" | "PAID" | "OVERDUE" {
  const s = String(baseStatus || "DRAFT").toUpperCase();
  if (balance <= 0) return "PAID";
  if (s === "DRAFT") return "DRAFT";

  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);

  const due0 = new Date(dueDate);
  due0.setHours(0, 0, 0, 0);

  if (due0.getTime() < today0.getTime()) return "OVERDUE";
  return "SENT";
}

function toRow(inv: any) {
  const paidAmount = sumPaid(inv.payments || []);
  const balanceAmount = Math.max(0, Number(inv.amount || 0) - paidAmount);

  const shipmentRef = inv.shipment?.reference || inv.shipmentId;
  const status = computeStatus(inv.status, inv.dueDate, balanceAmount);

  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    shipmentId: inv.shipmentId,
    shipmentRef,
    customerName: inv.customerName,
    customerGstin: inv.customerGstin,
    placeOfSupply: inv.placeOfSupply,
    currency: inv.currency,
    issueDate: ymd(inv.issueDate),
    dueDate: ymd(inv.dueDate),
    status,
    subtotal: Number(inv.subtotal || 0),
    totalTax: Number(inv.totalTax || 0),
    tdsRate: Number(inv.tdsRate || 0),
    tdsAmount: Number(inv.tdsAmount || 0),
    amount: Number(inv.amount || 0),
    paidAmount,
    balanceAmount,
  };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const shipmentId = String(url.searchParams.get("shipmentId") || "").trim();

    const where: any = {};
    if (shipmentId) where.shipmentId = shipmentId;

    const invoices = await prisma.shipmentInvoice.findMany({
      where,
      orderBy: { issueDate: "desc" },
      include: {
        payments: { select: { amount: true } },
        shipment: { select: { reference: true } },
      },
    });

    return NextResponse.json(invoices.map(toRow), { headers: noStoreHeaders });
  } catch (e: any) {
    console.error("GET /api/invoices failed:", e);
    return NextResponse.json(
      { message: e?.message || "Failed" },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

export async function POST(req: Request) {
  try {
    const actor = await getActorFromRequest(req);
    if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers: noStoreHeaders });

    const body = await req.json();

    const shipmentId = String(body.shipmentId || "").trim();
    const reqInvoiceNumber = String(body.invoiceNumber || "").trim(); // optional now
    const issueDate = safeDate(body.issueDate);
    const dueDate = safeDate(body.dueDate);
    const currency = String(body.currency || "INR").toUpperCase().trim();
    const customerGstin = body.customerGstin ? String(body.customerGstin).trim() : null;
    const placeOfSupply = body.placeOfSupply ? String(body.placeOfSupply).trim() : null;
    const tdsRate = Number(body.tdsRate || 0);
    const status = String(body.status || "DRAFT").toUpperCase().trim();
    const items = Array.isArray(body.items) ? body.items : [];

    if (!shipmentId) {
      return NextResponse.json({ message: "shipmentId is required" }, { status: 400, headers: noStoreHeaders });
    }
    if (!items.length) {
      return NextResponse.json({ message: "At least 1 invoice item required" }, { status: 400, headers: noStoreHeaders });
    }

    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: {
        id: true,
        reference: true,
        customer: { select: { companyName: true, currency: true } },
      },
    });
    if (!shipment) {
      return NextResponse.json({ message: "Invalid shipmentId" }, { status: 400, headers: noStoreHeaders });
    }

    const totals = calcTotals(items, tdsRate);

    const makeCreate = async (invoiceNumber: string) => {
      return prisma.shipmentInvoice.create({
        data: {
          shipmentId,
          invoiceNumber,
          customerName: shipment.customer?.companyName || "-",
          customerGstin,
          placeOfSupply,
          issueDate,
          dueDate,
          currency: shipment.customer?.currency ? shipment.customer.currency : currency,
          tdsRate,
          status: status || "DRAFT",
          items,
          subtotal: totals.subtotal,
          totalTax: totals.totalTax,
          tdsAmount: totals.tdsAmount,
          amount: totals.amount,
        },
        include: {
          payments: { select: { amount: true } },
          shipment: { select: { reference: true } },
        },
      });
    };

    let created: any;

    if (reqInvoiceNumber) {
      created = await makeCreate(reqInvoiceNumber);
    } else {
      let lastErr: any = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const invoiceNumber = await generateNextInvoiceNumber(issueDate);
        try {
          created = await makeCreate(invoiceNumber);
          break;
        } catch (e: any) {
          lastErr = e;
          if (e?.code === "P2002") continue;
          throw e;
        }
      }
      if (!created) throw lastErr || new Error("Failed to allocate invoice number");
    }

    await recalcShipmentInvoiceStatus(shipmentId);

    // ✅ AUDIT (CREATE) using enums
    await logAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: AuditAction.CREATE,
      entityType: AuditEntityType.INVOICE,
      entityId: created.id,
      entityRef: created.invoiceNumber,
      description: `Invoice created: ${created.invoiceNumber} for shipment ${shipment.reference || shipment.id}`,
      meta: {
        created: {
          id: created.id,
          invoiceNumber: created.invoiceNumber,
          shipmentId: created.shipmentId,
          shipmentRef: created.shipment?.reference || null,
          issueDate: ymd(created.issueDate),
          dueDate: ymd(created.dueDate),
          status: created.status,
          subtotal: Number(created.subtotal || 0),
          totalTax: Number(created.totalTax || 0),
          tdsRate: Number(created.tdsRate || 0),
          tdsAmount: Number(created.tdsAmount || 0),
          amount: Number(created.amount || 0),
          itemsCount: Array.isArray(created.items) ? created.items.length : 0,
        },
      },
    });

    return NextResponse.json(toRow(created), { headers: noStoreHeaders });
  } catch (e: any) {
    console.error("POST /api/invoices failed:", e);
    return NextResponse.json(
      { message: e?.message || "Failed to create invoice" },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

import { NextRequest,NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recalcShipmentInvoiceStatus } from "@/lib/financials";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" };

function safeDate(input: any): Date {
  const d = input ? new Date(input) : new Date();
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function ymd(d: Date): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function calcTotals(items: any[], tdsRate: number) {
  let subtotal = 0;
  let totalTax = 0;

  for (const it of items || []) {
    const qty = Number(it.quantity || 0);
    const rate = Number(it.rate || 0);
    const taxRate = Number(it.taxRate || 0);

    const taxable =
      typeof it.taxableValue === "number" ? Number(it.taxableValue) : qty * rate;

    // ✅ IMPORTANT FIX
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

function computeStatus(baseStatus: string, dueDate: Date, balance: number): "DRAFT" | "SENT" | "PAID" | "OVERDUE" {
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

function toDetail(inv: any) {
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

    items: Array.isArray(inv.items) ? inv.items : [],

    subtotal: Number(inv.subtotal || 0),
    totalTax: Number(inv.totalTax || 0),
    tdsRate: Number(inv.tdsRate || 0),
    tdsAmount: Number(inv.tdsAmount || 0),
    amount: Number(inv.amount || 0),

    // ✅ NEW
    paidAmount,
    balanceAmount,

    payments: inv.payments || [],
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
)  {
   try {
    const { id } = await params;

    const inv = await prisma.shipmentInvoice.findUnique({
      where: { id },
      include: {
        payments: { orderBy: { date: "desc" } },
        shipment: { select: { reference: true } },
      },
    });

    if (!inv) {
      return NextResponse.json(
        { message: "Invoice not found" },
        { status: 404, headers: noStoreHeaders }
      );
    }

    return NextResponse.json(toDetail(inv), { headers: noStoreHeaders });
  } catch (e: any) {
    console.error("GET /api/invoices/[id] failed:", e);
    return NextResponse.json(
      { message: e?.message || "Failed" },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const issueDate = safeDate(body.issueDate);
    const dueDate = safeDate(body.dueDate);
    const customerGstin = body.customerGstin ? String(body.customerGstin).trim() : null;
    const placeOfSupply = body.placeOfSupply ? String(body.placeOfSupply).trim() : null;
    const currency = String(body.currency || "INR").toUpperCase().trim();
    const tdsRate = Number(body.tdsRate || 0);
    const status = String(body.status || "DRAFT").toUpperCase().trim();
    const items = Array.isArray(body.items) ? body.items : [];

    const existing = await prisma.shipmentInvoice.findUnique({
      where: { id },
      select: { id: true, shipmentId: true },
    });
    if (!existing) {
      return NextResponse.json(
        { message: "Invoice not found" },
        { status: 404, headers: noStoreHeaders }
      );
    }

    const totals = calcTotals(items, tdsRate);

    const updated = await prisma.shipmentInvoice.update({
      where: { id },
      data: {
        issueDate,
        dueDate,
        customerGstin,
        placeOfSupply,
        currency,
        tdsRate,
        status,
        items,
        subtotal: totals.subtotal,
        totalTax: totals.totalTax,
        tdsAmount: totals.tdsAmount,
        amount: totals.amount,
      },
      include: {
        payments: { orderBy: { date: "desc" } },
        shipment: { select: { reference: true } },
      },
    });

    await recalcShipmentInvoiceStatus(existing.shipmentId);

    return NextResponse.json(toDetail(updated), { headers: noStoreHeaders });
  } catch (e: any) {
    console.error("PUT /api/invoices/[id] failed:", e);
    return NextResponse.json(
      { message: e?.message || "Failed" },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const inv = await prisma.shipmentInvoice.findUnique({
      where: { id },
      select: { id: true, shipmentId: true, payments: { select: { id: true } } },
    });

    if (!inv) {
      return NextResponse.json(
        { message: "Invoice not found" },
        { status: 404, headers: noStoreHeaders }
      );
    }

    if (inv.payments.length > 0) {
      return NextResponse.json(
        { message: "Cannot delete invoice with payments. Delete payments first." },
        { status: 400, headers: noStoreHeaders }
      );
    }

    await prisma.shipmentInvoice.delete({ where: { id } });
    await recalcShipmentInvoiceStatus(inv.shipmentId);

    return NextResponse.json({ ok: true }, { headers: noStoreHeaders });
  } catch (e: any) {
    console.error("DELETE /api/invoices/[id] failed:", e);
    return NextResponse.json(
      { message: e?.message || "Failed" },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

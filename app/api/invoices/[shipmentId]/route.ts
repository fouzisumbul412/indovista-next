import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" };
const clean = (v: any) => String(v ?? "").trim();

const toISODate = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const parseISODateOnly = (s: any) => {
  const v = clean(s);
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

const startOfToday = () => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
};

const isOverdue = (dueDate: Date) => {
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return due.getTime() < startOfToday().getTime();
};

// India FY label
function indianFiscalYearLabel(date: Date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const startYear = m >= 4 ? y : y - 1;
  const endYear = startYear + 1;
  const yy = (n: number) => String(n).slice(-2);
  return `${yy(startYear)}/${yy(endYear)}`;
}

function extractSeq3(source: string) {
  const m = String(source || "").match(/(\d+)\s*$/);
  const n = m ? Number(m[1]) : 0;
  return String(Number.isFinite(n) ? n : 0).padStart(3, "0");
}

function makeIndoInvoiceNumber(issueDate: Date, shipmentRefOrId: string) {
  const fy = indianFiscalYearLabel(issueDate);
  const seq = extractSeq3(shipmentRefOrId);
  return `INDO-${fy}-${seq}`;
}

type InvoiceLineItem = {
  id: string;
  description: string;
  hsnCode?: string;
  quantity: number;
  rate: number;
  taxRate: number;
  taxableValue: number;
  amount: number; // taxable + GST
};

function calcTotals(items: InvoiceLineItem[], tdsRate: number) {
  const subtotal = items.reduce((sum, it) => sum + (Number(it.taxableValue) || 0), 0);

  const totalTax = items.reduce((sum, it) => {
    const amt = Number(it.amount) || 0;
    const taxBase = Number(it.taxableValue) || 0;
    return sum + Math.max(0, amt - taxBase);
  }, 0);

  const totalAmount = subtotal + totalTax;
  const tdsAmount = subtotal * ((Number(tdsRate) || 0) / 100);

  // ✅ FIX: was comma operator in your screenshot
  const payable = totalAmount - tdsAmount;

  return { subtotal, totalTax, totalAmount, tdsAmount, payable };
}

// Next.js 15 params unwrap (same pattern you used)
type RouteCtx = {
  params: Promise<{ shipmentId: string }> | { shipmentId: string };
};

async function getShipmentId(ctx: RouteCtx) {
  const p: any = ctx?.params;
  const obj = typeof p?.then === "function" ? await p : p;
  return clean(decodeURIComponent(obj?.shipmentId || ""));
}

export async function GET(_: Request, ctx: RouteCtx) {
  try {
    const shipmentId = await getShipmentId(ctx);
    if (!shipmentId) return NextResponse.json({ message: "Missing shipmentId" }, { status: 400 });

    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: {
        id: true,
        reference: true,
        revenue: true,
        createdAt: true,
        customer: { select: { companyName: true } },
        currency: { select: { currencyCode: true } },
      },
    });

    if (!shipment) return NextResponse.json({ message: "Shipment not found" }, { status: 404 });

    const inv = await prisma.shipmentInvoice.findUnique({
      where: { shipmentId },
      select: {
        shipmentId: true,
        invoiceNumber: true,
        customerName: true,
        customerGstin: true,
        placeOfSupply: true,
        issueDate: true,
        dueDate: true,
        currency: true,
        tdsRate: true,
        status: true,
        items: true,
        subtotal: true,
        totalTax: true,
        tdsAmount: true,
        amount: true,
      },
    });

    // If invoice not created yet, return a sensible default structure
    if (!inv) {
      const issueDate = shipment.createdAt;
      const dueDate = addDays(issueDate, 30);
      const currency = shipment.currency?.currencyCode || "INR";
      const invoiceNumber = makeIndoInvoiceNumber(issueDate, shipment.reference || shipment.id);

      const rate = Number(shipment.revenue || 0) || 0;
      const qty = 1;
      const taxRate = 18;
      const taxableValue = qty * rate;
      const amount = taxableValue + taxableValue * (taxRate / 100);

      const items: InvoiceLineItem[] = [
        {
          id: "1",
          description: `Freight charges for shipment ${shipment.reference || ""}`,
          hsnCode: "",
          quantity: 1,
          rate,
          taxRate,
          taxableValue,
          amount,
        },
      ];

      const totals = calcTotals(items, 0);

      return NextResponse.json(
        {
          shipmentId,
          invoiceNumber,
          customerName: shipment.customer?.companyName || "",
          customerGstin: "",
          placeOfSupply: "",
          issueDate: toISODate(issueDate),
          dueDate: toISODate(dueDate),
          currency,
          tdsRate: 0,
          status: "DRAFT",
          items,
          subtotal: totals.subtotal,
          totalTax: totals.totalTax,
          tdsAmount: totals.tdsAmount,
          amount: totals.payable,
        },
        { headers: noStoreHeaders }
      );
    }

    // return saved invoice
    const due = new Date(inv.dueDate);
    const baseStatus = String(inv.status || "DRAFT").toUpperCase();
    const status = baseStatus !== "PAID" && isOverdue(due) ? "OVERDUE" : baseStatus;

    return NextResponse.json(
      {
        shipmentId: inv.shipmentId,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customerName,
        customerGstin: inv.customerGstin || "",
        placeOfSupply: inv.placeOfSupply || "",
        issueDate: toISODate(inv.issueDate),
        dueDate: toISODate(inv.dueDate),
        currency: inv.currency || "INR",
        tdsRate: Number(inv.tdsRate || 0),
        status,
        items: inv.items,
        subtotal: Number(inv.subtotal || 0),
        totalTax: Number(inv.totalTax || 0),
        tdsAmount: Number(inv.tdsAmount || 0),
        amount: Number(inv.amount || 0),
      },
      { headers: noStoreHeaders }
    );
  } catch (e: any) {
    console.error("GET /api/invoices/[shipmentId] failed:", e);
    return NextResponse.json(
      { message: e?.message || "Internal Server Error" },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

export async function PUT(req: Request, ctx: RouteCtx) {
  try {
    const shipmentId = await getShipmentId(ctx);
    if (!shipmentId) return NextResponse.json({ message: "Missing shipmentId" }, { status: 400 });

    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: {
        id: true,
        reference: true,
        customer: { select: { companyName: true } },
      },
    });
    if (!shipment) return NextResponse.json({ message: "Shipment not found" }, { status: 404 });

    const body = await req.json();

    const issueDate = parseISODateOnly(body.issueDate);
    if (!issueDate) return NextResponse.json({ message: "Invalid issueDate" }, { status: 400 });

    const dueDate = parseISODateOnly(body.dueDate) || addDays(issueDate, 30);

    const items: InvoiceLineItem[] = Array.isArray(body.items) ? body.items : [];
    if (!items.length) return NextResponse.json({ message: "At least one line item is required" }, { status: 400 });

    const tdsRate = Number(body.tdsRate || 0);
    const totals = calcTotals(items, tdsRate);

    const invoiceNumber = makeIndoInvoiceNumber(issueDate, shipment.reference || shipment.id);

    const saved = await prisma.shipmentInvoice.upsert({
      where: { shipmentId },
      create: {
        shipmentId,
        invoiceNumber,
        customerName: clean(body.customerName) || shipment.customer?.companyName || "",
        customerGstin: clean(body.customerGstin) || "",
        placeOfSupply: clean(body.placeOfSupply) || "",
        issueDate,
        dueDate,
        currency: clean(body.currency) || "INR",
        status: clean(body.status) || "DRAFT",
        tdsRate,
        items,
        subtotal: totals.subtotal,
        totalTax: totals.totalTax,
        tdsAmount: totals.tdsAmount,
        amount: totals.payable,
      },
      update: {
        invoiceNumber,
        customerName: clean(body.customerName) || shipment.customer?.companyName || "",
        customerGstin: clean(body.customerGstin) || "",
        placeOfSupply: clean(body.placeOfSupply) || "",
        issueDate,
        dueDate,
        currency: clean(body.currency) || "INR",
        status: clean(body.status) || "DRAFT",
        tdsRate,
        items,
        subtotal: totals.subtotal,
        totalTax: totals.totalTax,
        tdsAmount: totals.tdsAmount,
        amount: totals.payable,
      },
      select: { shipmentId: true, invoiceNumber: true },
    });

    return NextResponse.json(saved, { headers: noStoreHeaders });
  } catch (e: any) {
    console.error("PUT /api/invoices/[shipmentId] failed:", e);
    return NextResponse.json(
      { message: e?.message || "Failed to save invoice" },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

export async function DELETE(_: Request, ctx: RouteCtx) {
  try {
    const shipmentId = await getShipmentId(ctx);
    if (!shipmentId) return NextResponse.json({ message: "Missing shipmentId" }, { status: 400 });

    await prisma.shipmentInvoice.delete({ where: { shipmentId } }).catch(() => null);

    return NextResponse.json({ ok: true }, { headers: noStoreHeaders });
  } catch (e: any) {
    console.error("DELETE /api/invoices/[shipmentId] failed:", e);
    return NextResponse.json({ ok: true }, { headers: noStoreHeaders });
  }
}

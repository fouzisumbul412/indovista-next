import {  NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recalcInvoicePaidStatus, recalcShipmentInvoiceStatus } from "@/lib/financials";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" };

const allowedMethods = new Set(["UPI", "CASH", "ACCOUNT", "CHEQUE", "OTHER"]);
const allowedStatuses = new Set(["PENDING", "COMPLETED", "FAILED"]);

function safeDate(input: any): Date {
  const d = input ? new Date(input) : new Date();
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const amount = Number(body.amount);
    const currency = String(body.currency ?? "INR").toUpperCase().trim();
    const method = String(body.method ?? "").toUpperCase().trim();
    const status = String(body.status ?? "PENDING").toUpperCase().trim();

    const transactionNum = body.transactionNum ? String(body.transactionNum).trim() : null;
    const date = safeDate(body.date);
    const notes = body.notes ? String(body.notes).trim() : null;

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ message: "amount must be > 0" }, { status: 400, headers: noStoreHeaders });
    }
    if (!allowedMethods.has(method)) {
      return NextResponse.json({ message: "Invalid payment method" }, { status: 400, headers: noStoreHeaders });
    }
    if (!allowedStatuses.has(status)) {
      return NextResponse.json({ message: "Invalid payment status" }, { status: 400, headers: noStoreHeaders });
    }

    const existing = await prisma.payment.findUnique({
      where: { id },
      select: { id: true, shipmentId: true, invoiceId: true },
    });
    if (!existing) return NextResponse.json({ message: "Payment not found" }, { status: 404, headers: noStoreHeaders });

    const updated = await prisma.payment.update({
      where: { id },
      data: {
        amount,
        currency,
        method: method as any,
        transactionNum,
        date,
        notes,
        status: status as any,
      },
    });

    if (existing.invoiceId) await recalcInvoicePaidStatus(existing.invoiceId);
    await recalcShipmentInvoiceStatus(existing.shipmentId);

    return NextResponse.json(updated, { headers: noStoreHeaders });
  } catch (e: any) {
    console.error("PUT /api/payments/[id] failed:", e);
    return NextResponse.json({ message: e?.message || "Failed" }, { status: 500, headers: noStoreHeaders });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.payment.findUnique({
      where: { id },
      select: { id: true, shipmentId: true, invoiceId: true },
    });
    if (!existing) return NextResponse.json({ message: "Payment not found" }, { status: 404, headers: noStoreHeaders });

    await prisma.payment.delete({ where: { id } });

    if (existing.invoiceId) await recalcInvoicePaidStatus(existing.invoiceId);
    await recalcShipmentInvoiceStatus(existing.shipmentId);

    return NextResponse.json({ ok: true }, { headers: noStoreHeaders });
  } catch (e: any) {
    console.error("DELETE /api/payments/[id] failed:", e);
    return NextResponse.json({ message: e?.message || "Failed" }, { status: 500, headers: noStoreHeaders });
  }
}

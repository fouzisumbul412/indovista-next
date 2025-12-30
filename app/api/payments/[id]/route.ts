// app/api/payments/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recalcInvoicePaidStatus, recalcShipmentInvoiceStatus } from "@/lib/financials";
import { logAudit } from "@/lib/audit";
import { getActorFromRequest } from "@/lib/getActor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

enum AuditAction {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
}
enum AuditEntityType {
  PAYMENT = "PAYMENT",
}

const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" };

const allowedMethods = new Set(["UPI", "CASH", "ACCOUNT", "CHEQUE", "OTHER"]);
const allowedStatuses = new Set(["PENDING", "COMPLETED", "FAILED"]);

function safeDate(input: any): Date {
  const d = input ? new Date(input) : new Date();
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function toJson(value: any) {
  return JSON.parse(
    JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
  );
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActorFromRequest(req);
    if (!actor) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers: noStoreHeaders });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

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

    const before = await prisma.payment.findUnique({
      where: { id },
      select: {
        id: true,
        shipmentId: true,
        invoiceId: true,
        amount: true,
        currency: true,
        method: true,
        status: true,
        transactionNum: true,
        date: true,
      },
    });
    if (!before) {
      return NextResponse.json({ message: "Payment not found" }, { status: 404, headers: noStoreHeaders });
    }

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
      select: {
        id: true,
        shipmentId: true,
        invoiceId: true,
        amount: true,
        currency: true,
        method: true,
        status: true,
        transactionNum: true,
        date: true,
      },
    });

    if (before.invoiceId) await recalcInvoicePaidStatus(before.invoiceId);
    await recalcShipmentInvoiceStatus(before.shipmentId);

    await logAudit({
       actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: AuditAction.UPDATE as any,
      entityType: AuditEntityType.PAYMENT as any,
      entityId: updated.id,
      entityRef: updated.transactionNum || updated.id,
      description: `Payment updated: ${updated.amount} ${updated.currency} (${updated.method}) status=${updated.status}`,
      meta: { before: toJson(before), after: toJson(updated) },
    });

    return NextResponse.json(updated, { headers: noStoreHeaders });
  } catch (e: any) {
    console.error("PUT /api/payments/[id] failed:", e);
    return NextResponse.json({ message: e?.message || "Failed" }, { status: 500, headers: noStoreHeaders });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActorFromRequest(_req);
    if (!actor) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers: noStoreHeaders });
    }

    const { id } = await params;

    const before = await prisma.payment.findUnique({
      where: { id },
      select: {
        id: true,
        shipmentId: true,
        invoiceId: true,
        amount: true,
        currency: true,
        method: true,
        status: true,
        transactionNum: true,
        date: true,
      },
    });
    if (!before) {
      return NextResponse.json({ message: "Payment not found" }, { status: 404, headers: noStoreHeaders });
    }

    await prisma.payment.delete({ where: { id } });

    if (before.invoiceId) await recalcInvoicePaidStatus(before.invoiceId);
    await recalcShipmentInvoiceStatus(before.shipmentId);

    await logAudit({
       actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: AuditAction.DELETE as any,
      entityType: AuditEntityType.PAYMENT as any,
      entityId: before.id,
      entityRef: before.transactionNum || before.id,
      description: `Payment deleted: ${before.amount} ${before.currency} (${before.method}) status=${before.status}`,
      meta: { deleted: toJson(before) },
    });

    return NextResponse.json({ ok: true }, { headers: noStoreHeaders });
  } catch (e: any) {
    console.error("DELETE /api/payments/[id] failed:", e);
    return NextResponse.json({ message: e?.message || "Failed" }, { status: 500, headers: noStoreHeaders });
  }
}

// app/api/payments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getActorFromRequest } from "@/lib/getActor";
import { recalcInvoicePaidStatus, recalcShipmentInvoiceStatus } from "@/lib/financials";

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

const clean = (v: any) => String(v ?? "").trim();
const upper = (v: any, fallback: string) => clean(v || fallback).toUpperCase();

const allowedMethods = new Set(["UPI", "CASH", "ACCOUNT", "CHEQUE", "OTHER"]);
const allowedStatuses = new Set(["PENDING", "COMPLETED", "FAILED"]);

function toJson(value: any) {
  return JSON.parse(
    JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
  );
}

function safeDate(input: any): Date {
  const d = input ? new Date(input) : new Date();
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getActorFromRequest(req);
    if (!actor) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers: noStoreHeaders });
    }

    const body = await req.json().catch(() => ({}));

    const shipmentId = clean(body.shipmentId);
    const invoiceId = clean(body.invoiceId) ? clean(body.invoiceId) : null;

    const amount = Number(body.amount);
    const method = upper(body.method, "UPI");
    const status = upper(body.status, "PENDING");

    if (!shipmentId) {
      return NextResponse.json({ message: "shipmentId is required" }, { status: 400, headers: noStoreHeaders });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ message: "amount must be > 0" }, { status: 400, headers: noStoreHeaders });
    }
    if (!allowedMethods.has(method)) {
      return NextResponse.json({ message: "Invalid payment method" }, { status: 400, headers: noStoreHeaders });
    }
    if (!allowedStatuses.has(status)) {
      return NextResponse.json({ message: "Invalid payment status" }, { status: 400, headers: noStoreHeaders });
    }

    // ensure shipment exists + grab defaults
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: {
        id: true,
        currency: { select: { currencyCode: true } },
        customer: { select: { currency: true } },
      },
    });
    if (!shipment) {
      return NextResponse.json({ message: "Invalid shipmentId" }, { status: 400, headers: noStoreHeaders });
    }

    // if invoiceId is provided, validate it belongs to this shipment + use its currency
    let invoiceCurrency: string | null = null;
    if (invoiceId) {
      const inv = await prisma.shipmentInvoice.findUnique({
        where: { id: invoiceId },
        select: { id: true, shipmentId: true, currency: true },
      });
      if (!inv) return NextResponse.json({ message: "Invalid invoiceId" }, { status: 400, headers: noStoreHeaders });
      if (inv.shipmentId !== shipmentId) {
        return NextResponse.json(
          { message: "invoiceId does not belong to this shipment" },
          { status: 400, headers: noStoreHeaders }
        );
      }
      invoiceCurrency = inv.currency;
    }

    const currency =
      clean(body.currency) ||
      invoiceCurrency ||
      shipment.currency?.currencyCode ||
      (shipment.customer?.currency as any) ||
      "INR";

    const created = await prisma.payment.create({
      data: {
        shipmentId,
        // ✅ pass null only if column is nullable in DB
        invoiceId: invoiceId ?? null,
        amount,
        currency: currency.toUpperCase(),
        method: method as any,
        transactionNum: clean(body.transactionNum) ? clean(body.transactionNum) : null,
        date: safeDate(body.date),
        notes: clean(body.notes) ? clean(body.notes) : null,
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

    // ✅ IMPORTANT: POST must also recalc
    if (created.invoiceId) await recalcInvoicePaidStatus(created.invoiceId);
    await recalcShipmentInvoiceStatus(created.shipmentId);

    await logAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: AuditAction.CREATE as any,
      entityType: AuditEntityType.PAYMENT as any,
      entityId: created.id,
      entityRef: created.transactionNum || created.id,
      description: `Payment created: ${created.amount} ${created.currency} (${created.method}) status=${created.status}`,
      meta: { created: toJson(created) },
    });

    // keep response shape stable (if your UI expects just {id})
    return NextResponse.json({ id: created.id }, { headers: noStoreHeaders });
  } catch (e: any) {
    console.error("POST /api/payments failed:", e);
    return NextResponse.json(
      { message: e?.message || "Payment create failed" },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

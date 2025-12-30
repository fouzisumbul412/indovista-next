// app/api/quotes/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActorFromRequest } from "@/lib/getActor";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

enum AuditAction {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
}
enum AuditEntityType {
  QUOTE = "QUOTE",
}

const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" };
const clean = (v: any) => String(v ?? "").trim();
const upper = (v: any, fallback: string) => clean(v || fallback).toUpperCase();

type RouteCtx = { params: Promise<{ id: string }> | { id: string } };

function toJson(value: any) {
  return JSON.parse(
    JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
  );
}

async function getParamId(ctx: RouteCtx) {
  const p: any = ctx?.params;
  const obj = typeof p?.then === "function" ? await p : p;
  return decodeURIComponent(clean(obj?.id || ""));
}

function calcSubtotal(charges: { amount: number; quantity?: number | null }[]) {
  return charges.reduce((sum, c) => sum + Number(c.amount || 0) * Number(c.quantity ?? 1), 0);
}

function clampPercent(n: any) {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

function computeTax(subtotal: number, taxPercent: number, taxesIncluded: boolean) {
  const pct = clampPercent(taxPercent);
  const r = pct / 100;

  if (r <= 0 || subtotal <= 0) return { taxPercent: pct, taxAmount: 0, total: subtotal };

  if (taxesIncluded) {
    const base = subtotal / (1 + r);
    const taxAmount = subtotal - base;
    return { taxPercent: pct, taxAmount, total: subtotal };
  }

  const taxAmount = subtotal * r;
  return { taxPercent: pct, taxAmount, total: subtotal + taxAmount };
}

export async function GET(_: Request, ctx: RouteCtx) {
  try {
    const id = await getParamId(ctx);

    const q = await prisma.quote.findUnique({
      where: { id },
      include: { charges: { orderBy: { createdAt: "asc" } } },
    });

    if (!q) return new NextResponse("Not found", { status: 404 });

    return NextResponse.json(
      {
        ...q,
        quoteDate: q.quoteDate ? q.quoteDate.toISOString().slice(0, 10) : "",
        validTill: q.validTill ? q.validTill.toISOString().slice(0, 10) : "",
      },
      { headers: noStoreHeaders }
    );
  } catch (e: any) {
    console.error("GET /api/quotes/[id] failed:", e);
    return NextResponse.json({ message: e?.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  try {
    const actor = await getActorFromRequest(req);
    if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers: noStoreHeaders });

    const id = await getParamId(ctx);
    const body = await req.json().catch(() => ({}));

    const existing = await prisma.quote.findUnique({
      where: { id },
      include: { charges: true },
    });
    if (!existing) return new NextResponse("Not found", { status: 404 });

    const status = body.status ? (upper(body.status, existing.status) as any) : existing.status;
    const validityDays = body.validityDays != null ? Number(body.validityDays) : existing.validityDays;
    const validTill = body.validTill && clean(body.validTill) ? new Date(body.validTill) : existing.validTill;
    const preparedBy = body.preparedBy != null ? (clean(body.preparedBy) || null) : existing.preparedBy;

    const currencyCode = body.currencyCode ? clean(body.currencyCode) : existing.currencyCode;

    const taxesIncluded = body.taxesIncluded != null ? Boolean(body.taxesIncluded) : Boolean(existing.taxesIncluded);
    const taxPercent =
      body.taxPercent != null ? clampPercent(body.taxPercent) : clampPercent((existing as any).taxPercent);

    const notesIncluded = body.notesIncluded != null ? (clean(body.notesIncluded) || null) : existing.notesIncluded;
    const notesExcluded = body.notesExcluded != null ? (clean(body.notesExcluded) || null) : existing.notesExcluded;
    const disclaimer = body.disclaimer != null ? (clean(body.disclaimer) || null) : existing.disclaimer;

    const incomingCharges = Array.isArray(body.charges) ? body.charges : null;

    const charges =
      incomingCharges && incomingCharges.length
        ? incomingCharges.map((c: any) => ({
            name: clean(c.name) || "Charge",
            chargeType: upper(c.chargeType, "FLAT"),
            currencyCode: clean(c.currencyCode) || currencyCode,
            quantity: c.quantity != null ? Number(c.quantity) : 1,
            unitLabel: clean(c.unitLabel) || null,
            amount: Number(c.amount || 0),
          }))
        : existing.charges.map((c: any) => ({
            name: c.name,
            chargeType: c.chargeType,
            currencyCode: c.currencyCode,
            quantity: c.quantity ?? 1,
            unitLabel: c.unitLabel,
            amount: c.amount,
          }));

    const subtotal = calcSubtotal(charges);
    const { taxAmount, total } = computeTax(subtotal, taxPercent, taxesIncluded);

    const updated = await prisma.$transaction(async (tx) => {
      const q = await tx.quote.update({
        where: { id },
        data: {
          status,
          validityDays,
          validTill,
          preparedBy,

          currencyCode,

          taxesIncluded,
          taxPercent,
          taxAmount,

          subtotal,
          total,

          notesIncluded,
          notesExcluded,
          disclaimer,
        },
      });

      if (incomingCharges) {
        await tx.quoteCharge.deleteMany({ where: { quoteId: id } });
        if (charges.length) {
          await tx.quoteCharge.createMany({
            data: charges.map((c: any) => ({
              quoteId: id,
              name: c.name,
              chargeType: c.chargeType,
              currencyCode: c.currencyCode,
              quantity: c.quantity ?? 1,
              unitLabel: c.unitLabel ?? null,
              amount: c.amount ?? 0,
            })),
          });
        }
      }

      return q;
    });

    await logAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: AuditAction.UPDATE as any,
      entityType: AuditEntityType.QUOTE as any,
      entityId: id,
      entityRef: id,
      description: `Quote updated: ${id}`,
      meta: {
        before: toJson({
          status: existing.status,
          validityDays: existing.validityDays,
          validTill: existing.validTill,
          preparedBy: existing.preparedBy,
          currencyCode: existing.currencyCode,
          taxesIncluded: existing.taxesIncluded,
          taxPercent: (existing as any).taxPercent,
          taxAmount: (existing as any).taxAmount,
          subtotal: existing.subtotal,
          total: existing.total,
          notesIncluded: existing.notesIncluded,
          notesExcluded: existing.notesExcluded,
          disclaimer: existing.disclaimer,
          chargesCount: existing.charges?.length || 0,
        }),
        after: toJson({
          status: updated.status,
          validityDays: updated.validityDays,
          validTill: updated.validTill,
          preparedBy: updated.preparedBy,
          currencyCode: updated.currencyCode,
          taxesIncluded: updated.taxesIncluded,
          taxPercent: (updated as any).taxPercent,
          taxAmount: (updated as any).taxAmount,
          subtotal: updated.subtotal,
          total: updated.total,
          notesIncluded: updated.notesIncluded,
          notesExcluded: updated.notesExcluded,
          disclaimer: updated.disclaimer,
          chargesCount: charges.length,
        }),
      },
    });

    return NextResponse.json({ id }, { headers: noStoreHeaders });
  } catch (e: any) {
    console.error("PATCH /api/quotes/[id] failed:", e);
    return NextResponse.json({ message: e?.message || "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  try {
    const actor = await getActorFromRequest(req);
    if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers: noStoreHeaders });

    const id = await getParamId(ctx);

    const existing = await prisma.quote.findUnique({
      where: { id },
      select: { id: true, shipmentId: true, customerId: true, customerName: true, currencyCode: true, subtotal: true, total: true, status: true },
    });
    if (!existing) return new NextResponse("Not found", { status: 404 });

    await prisma.quote.delete({ where: { id } });

    await logAudit({
      actorName: actor.name,
      actorUserId: actor.id,
      actorRole: actor.role,
      action: AuditAction.DELETE as any,
      entityType: AuditEntityType.QUOTE as any,
      entityId: existing.id,
      entityRef: existing.id,
      description: `Quote deleted: ${existing.id}`,
      meta: { deleted: toJson(existing) },
    });

    return NextResponse.json({ ok: true }, { headers: noStoreHeaders });
  } catch (e: any) {
    console.error("DELETE /api/quotes/[id] failed:", e);
    return NextResponse.json({ message: e?.message || "Delete failed" }, { status: 500 });
  }
}

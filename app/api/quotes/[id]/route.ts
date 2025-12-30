import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" };
const clean = (v: any) => String(v ?? "").trim();
const upper = (v: any, fallback: string) => clean(v || fallback).toUpperCase();

type RouteCtx = { params: Promise<{ id: string }> | { id: string } };

async function getParamId(ctx: RouteCtx) {
  const p: any = ctx?.params;
  const obj = typeof p?.then === "function" ? await p : p;
  return decodeURIComponent(clean(obj?.id || ""));
}

function calcSubtotal(charges: { amount: number; quantity?: number | null }[]) {
  return charges.reduce((sum, c) => sum + (Number(c.amount || 0) * Number(c.quantity ?? 1)), 0);
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

export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    const id = await getParamId(ctx);
    const body = await req.json();

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

    // ✅ NEW tax fields
    const taxesIncluded = body.taxesIncluded != null ? Boolean(body.taxesIncluded) : Boolean(existing.taxesIncluded);
    const taxPercent =
      body.taxPercent != null
        ? clampPercent(body.taxPercent)
        : clampPercent((existing as any).taxPercent);

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

    await prisma.quote.update({
      where: { id },
      data: {
        status,
        validityDays,
        validTill,
        preparedBy,

        currencyCode,

        // ✅ NEW
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
      await prisma.quoteCharge.deleteMany({ where: { quoteId: id } });
      if (charges.length) {
        await prisma.quoteCharge.createMany({
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

    return NextResponse.json({ id }, { headers: noStoreHeaders });
  } catch (e: any) {
    console.error("PATCH /api/quotes/[id] failed:", e);
    return NextResponse.json({ message: e?.message || "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_: Request, ctx: RouteCtx) {
  try {
    const id = await getParamId(ctx);
    await prisma.quote.delete({ where: { id } });
    return NextResponse.json({ ok: true }, { headers: noStoreHeaders });
  } catch (e: any) {
    console.error("DELETE /api/quotes/[id] failed:", e);
    return NextResponse.json({ message: e?.message || "Delete failed" }, { status: 500 });
  }
}

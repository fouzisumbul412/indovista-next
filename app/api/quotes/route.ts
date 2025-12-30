// app/api/quotes/route.ts
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
const pad3 = (n: number) => String(n).padStart(3, "0");

function toJson(value: any) {
  return JSON.parse(
    JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
  );
}

function safePortCode(port: any, city?: string | null) {
  if (port?.code) return String(port.code).toUpperCase();
  const c = clean(city);
  return c ? c.slice(0, 3).toUpperCase() : "---";
}

async function nextQuoteId(year: number) {
  const prefix = `QT-${year}-`;
  const last = await prisma.quote.findFirst({
    where: { id: { startsWith: prefix } },
    orderBy: { id: "desc" },
    select: { id: true },
  });

  const lastNum = last?.id ? Number(last.id.split("-")[2]) : 0;
  const next = (Number.isFinite(lastNum) ? lastNum : 0) + 1;

  if (next > 999) throw new Error(`Quote sequence exceeded 999 for year ${year}`);
  return `${prefix}${pad3(next)}`;
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

  if (r <= 0 || subtotal <= 0) {
    return { taxPercent: pct, taxAmount: 0, total: subtotal };
  }

  if (taxesIncluded) {
    const base = subtotal / (1 + r);
    const taxAmount = subtotal - base;
    return { taxPercent: pct, taxAmount, total: subtotal };
  }

  const taxAmount = subtotal * r;
  return { taxPercent: pct, taxAmount, total: subtotal + taxAmount };
}

function defaultCharges(currencyCode: string, freightAmount: number) {
  const base = [
    { name: "Freight Charges (Estimated)", chargeType: "FLAT", amount: freightAmount || 0, quantity: 1, unitLabel: null },
    { name: "Origin Handling", chargeType: "FLAT", amount: 0, quantity: 1, unitLabel: null },
    { name: "Destination Handling", chargeType: "FLAT", amount: 0, quantity: 1, unitLabel: null },
    { name: "Documentation Charges", chargeType: "FLAT", amount: 0, quantity: 1, unitLabel: null },
  ];
  return base.map((x) => ({ ...x, currencyCode }));
}

export async function GET() {
  try {
    const rows = await prisma.quote.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        customerName: true,
        originCity: true,
        originCountry: true,
        destCity: true,
        destCountry: true,
        mode: true,
        commodity: true,
        currencyCode: true,
        total: true,
        validTill: true,
        status: true,
      },
    });

    const list = rows.map((q: any) => ({
      id: q.id,
      reference: q.id,
      customer: q.customerName,
      origin: { city: q.originCity, country: q.originCountry },
      destination: { city: q.destCity, country: q.destCountry },
      mode: q.mode,
      commodity: q.commodity,
      currency: q.currencyCode,
      estValue: Number(q.total || 0),
      validTill: q.validTill ? q.validTill.toISOString().slice(0, 10) : "",
      status: q.status,
    }));

    return NextResponse.json(list, { headers: noStoreHeaders });
  } catch (e: any) {
    console.error("GET /api/quotes failed:", e);
    return NextResponse.json({ message: e?.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getActorFromRequest(req);
    if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers: noStoreHeaders });

    const body = await req.json().catch(() => ({}));
    const shipmentId = clean(body.shipmentId);
    if (!shipmentId) return new NextResponse("shipmentId is required", { status: 400 });

    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        customer: true,
        items: { include: { product: { include: { category: true, temperature: true } } } },
        currency: true,
        incoterm: true,
        containerType: true,
        temperature: true,
        originPort: true,
        destPort: true,
      },
    });

    if (!shipment) return new NextResponse("Shipment not found", { status: 404 });

    const quoteDate = new Date();
    const year = quoteDate.getFullYear();

    const validityDays = body.validityDays != null && body.validityDays !== "" ? Number(body.validityDays) : 7;
    const validTill =
      body.validTill && clean(body.validTill)
        ? new Date(body.validTill)
        : new Date(quoteDate.getTime() + validityDays * 24 * 60 * 60 * 1000);

    const status = upper(body.status, "DRAFT") as any;
    const preparedBy = clean(body.preparedBy) || null;

    const currencyCode =
      clean(body.currencyCode) ||
      shipment.currency?.currencyCode ||
      shipment.customer?.currency ||
      "INR";

    const originPortCode = safePortCode(shipment.originPort, shipment.originCity);
    const destPortCode = safePortCode(shipment.destPort, shipment.destCity);

    const temperatureRange =
      shipment.temperature?.range ||
      shipment.items?.map((i: any) => (i.product as any)?.temperature?.range).find(Boolean) ||
      null;

    const items = shipment.items || [];
    const totalWeightKg = items.reduce((sum: number, it: any) => sum + Number(it.weightKg || 0), 0);
    const packagesCount = items.reduce((sum: number, it: any) => sum + Number(it.quantity || 0), 0);
    const packagingType = items.map((x: any) => clean(x.packaging)).find((p: any) => !!p) || null;

    const containersCount = shipment.containerTypeId ? 1 : null;
    const totalVolumeCbm = 0;

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
        : defaultCharges(currencyCode, Number(shipment.revenue || 0));

    const subtotal = calcSubtotal(charges);

    const taxesIncluded = Boolean(body.taxesIncluded);
    const taxPercent = clampPercent(body.taxPercent);
    const { taxAmount, total } = computeTax(subtotal, taxPercent, taxesIncluded);

    const notesIncluded = clean(body.notesIncluded) || null;
    const notesExcluded = clean(body.notesExcluded) || null;
    const disclaimer =
      clean(body.disclaimer) ||
      "Rates are subject to space & carrier availability. Prices may change due to fuel/currency fluctuations.";

    for (let attempt = 0; attempt < 5; attempt++) {
      const quoteId = await nextQuoteId(year);
      try {
        const created = await prisma.$transaction(async (tx) => {
          const q = await tx.quote.create({
            data: {
              id: quoteId,
              shipmentId: shipment.id,
              customerId: shipment.customerId,

              quoteDate,
              validityDays,
              validTill,
              status,
              preparedBy,

              customerName: shipment.customer?.companyName || "",
              contactPerson: shipment.customer?.contactPerson || null,
              email: shipment.customer?.email || null,
              phone: shipment.customer?.phone || null,
              address: shipment.customer?.address || null,
              country: shipment.customer?.country || null,

              originCity: shipment.originCity,
              originCountry: shipment.originCountry,
              originPortCode,

              destCity: shipment.destCity,
              destCountry: shipment.destCountry,
              destPortCode,

              mode: shipment.mode,
              direction: shipment.direction,
              commodity: shipment.commodity,
              incotermCode: shipment.incoterm?.code || null,

              containerTypeCode: shipment.containerType?.code || null,
              containersCount,

              temperatureRange,
              specialHandlingNotes: null,

              totalWeightKg,
              totalVolumeCbm,
              packagesCount,
              packagingType,

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
            select: { id: true },
          });

          await tx.quoteCharge.createMany({
            data: charges.map((c: any) => ({
              quoteId: q.id,
              name: c.name,
              chargeType: c.chargeType,
              currencyCode: c.currencyCode,
              quantity: c.quantity ?? 1,
              unitLabel: c.unitLabel ?? null,
              amount: c.amount ?? 0,
            })),
          });

          return q;
        });

        await logAudit({
          actorUserId: actor.id,
          actorName: actor.name,
          actorRole: actor.role,
          action: AuditAction.CREATE as any,
          entityType: AuditEntityType.QUOTE as any,
          entityId: created.id,
          entityRef: created.id,
          description: `Quote created: ${created.id} for shipment ${shipment.id}`,
          meta: {
            shipmentId: shipment.id,
            customerId: shipment.customerId,
            currencyCode,
            subtotal,
            taxPercent,
            taxAmount,
            total,
            chargesCount: charges.length,
          },
        });

        return NextResponse.json({ id: created.id }, { headers: noStoreHeaders });
      } catch (e: any) {
        if (e?.code === "P2002") continue;
        throw e;
      }
    }

    return new NextResponse("Could not generate a unique quote id", { status: 500 });
  } catch (e: any) {
    console.error("POST /api/quotes failed:", e);
    return new NextResponse(e?.message || "Create quote failed", { status: 500 });
  }
}

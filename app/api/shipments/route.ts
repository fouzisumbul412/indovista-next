import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const d = (v: any) => (v ? new Date(v) : null);
const pad3 = (n: number) => String(n).padStart(3, "0");

function refPrefix(direction: string, commodity: string) {
  const dir = direction === "IMPORT" ? "IMP" : "EXP";
  const com =
    commodity === "FROZEN" ? "FZ" :
    commodity === "SPICE" ? "SP" :
    commodity === "BOTH" ? "MX" : "OT";
  return `${dir}-${com}-`;
}

async function nextShipmentId(year: number) {
  const prefix = `SHP-${year}-`;

  const last = await prisma.shipment.findFirst({
    where: { id: { startsWith: prefix } },
    orderBy: { id: "desc" }, // works because we pad with 3 digits
    select: { id: true },
  });

  const lastNum = last ? Number(last.id.split("-")[2]) : 0;
  return `${prefix}${pad3(lastNum + 1)}`;
}

async function nextReference(direction: string, commodity: string) {
  const prefix = refPrefix(direction, commodity);

  const last = await prisma.shipment.findFirst({
    where: { reference: { startsWith: prefix } },
    orderBy: { reference: "desc" }, // works because we pad with 3 digits
    select: { reference: true },
  });

  const lastNum = last ? Number(last.reference.split("-")[2]) : 0;
  return `${prefix}${pad3(lastNum + 1)}`;
}

/**
 * ✅ Resolve a currencyId from:
 * 1) payload financials.currency (code or number)
 * 2) customer.currency (code)
 * 3) fallback "INR"
 */
async function resolveCurrencyId(customerId: string, payloadCurrency: any) {
  let cur: any = payloadCurrency;

  if (cur == null || cur === "") {
    const c = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { currency: true },
    });
    cur = c?.currency || "INR";
  }

  // If someone sends numeric id by mistake, allow it
  if (typeof cur === "number") return cur;

  const code = String(cur).trim().toUpperCase();
  const row = await prisma.currency.findUnique({
    where: { currencyCode: code },
    select: { id: true },
  });

  if (!row) {
    throw new Error(
      `Currency '${code}' not found in Currency master. Add it in Currency table (master-data) and try again.`
    );
  }

  return row.id;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      reference,
      masterDoc,
      customerId,
      direction,
      mode,
      incotermId,
      commodity,
      origin,
      destination,
      containerTypeId,
      temperatureId,
      items,
      status,
      etd,
      eta,
      slaStatus,
      financials,
    } = body;

    if (!customerId || !direction || !mode || !origin || !destination) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const revenue = Number(financials?.revenue ?? 0) || 0;
    const cost = Number(financials?.cost ?? 0) || 0;
    const margin = revenue - cost;

    // ✅ FIX: store currencyId (relation), not "currency" string
    const currencyId = await resolveCurrencyId(customerId, financials?.currency);

    const year = new Date().getFullYear();

    // retry loop to avoid collisions if two users create at same time
    for (let attempt = 0; attempt < 5; attempt++) {
      const shipmentId = await nextShipmentId(year);

      const finalRef =
        reference && String(reference).trim()
          ? String(reference).trim()
          : await nextReference(direction, commodity);

      try {
        const created = await prisma.shipment.create({
          data: {
            id: shipmentId, // ✅ SHP-YYYY-001
            reference: finalRef, // ✅ IMP-FZ-001
            masterDoc: masterDoc || null,

            customerId,
            direction,
            mode,
            commodity,

            incotermId: incotermId ? Number(incotermId) : null,

            originCity: origin.city,
            originCountry: origin.country,
            originContact: origin.contact || null,
            originPortId: origin.portId ? Number(origin.portId) : null,

            destCity: destination.city,
            destCountry: destination.country,
            destContact: destination.contact || null,
            destPortId: destination.portId ? Number(destination.portId) : null,

            containerTypeId: containerTypeId ? Number(containerTypeId) : null,
            temperatureId: temperatureId ? Number(temperatureId) : null,

            status: status || "BOOKED",
            etd: d(etd),
            eta: d(eta),
            slaStatus: slaStatus || "ON_TIME",

            // ✅ FIX HERE
            currencyId,
            revenue,
            cost,
            margin,
            invoiceStatus: financials?.invoiceStatus || "DRAFT",

            items: items?.length
              ? {
                  create: items.map((it: any) => ({
                    productId: it.productId,
                    quantity: Number(it.quantity || 0),
                    unit: it.unit || "Unit",
                    weightKg: it.weightKg != null ? Number(it.weightKg) : null,
                    packaging: it.packaging || null,
                  })),
                }
              : undefined,

            events: {
              create: {
                status: status || "BOOKED",
                location: origin.city || null,
                description: "Shipment created",
                user: "System",
              },
            },
          },
        });

        return NextResponse.json({ id: created.id, reference: created.reference });
      } catch (e: any) {
        // Prisma unique constraint collision (id/reference). Retry.
        if (e?.code === "P2002") continue;
        throw e;
      }
    }

    return new NextResponse("Could not generate a unique shipment id/reference", { status: 500 });
  } catch (e: any) {
    // ✅ Return readable error to frontend instead of blank "Create shipment failed"
    return new NextResponse(e?.message || "Create shipment failed", { status: 500 });
  }
}

export async function GET() {
  const rows = await prisma.shipment.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { companyName: true } },
      originPort: { select: { code: true } },
      destPort: { select: { code: true } },
    },
  });

  return NextResponse.json(
    rows.map((s) => ({
      id: s.id,
      reference: s.reference,
      masterDoc: s.masterDoc || "",
      customer: s.customer.companyName,
      origin: { code: s.originPort?.code || "—", city: s.originCity, country: s.originCountry },
      destination: { code: s.destPort?.code || "—", city: s.destCity, country: s.destCountry },
      mode: s.mode,
      direction: s.direction,
      commodity: s.commodity,
      status: s.status,
      slaStatus: s.slaStatus,
      eta: s.eta ? s.eta.toISOString().slice(0, 10) : "",
    }))
  );
}

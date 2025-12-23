import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const clean = (v: any) => String(v ?? "").trim();
const upper = (v: any, fallback: string) => clean(v || fallback).toUpperCase();
const d = (v: any) => (v ? new Date(v) : null);
const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" };

const pad3 = (n: number) => String(n).padStart(3, "0");

function refPrefix(direction: string, commodity: string) {
  const dir = direction === "IMPORT" ? "IMP" : "EXP";
  const com =
    commodity === "FROZEN"
      ? "FZ"
      : commodity === "SPICE"
      ? "SP"
      : commodity === "BOTH"
      ? "MX"
      : "OT";
  return `${dir}-${com}-`;
}

async function nextShipmentId(year: number) {
  const prefix = `SHP-${year}-`;

  const last = await prisma.shipment.findFirst({
    where: { id: { startsWith: prefix } },
    orderBy: { id: "desc" }, // safe due to pad3
    select: { id: true },
  });

  const lastNum = last?.id ? Number(last.id.split("-")[2]) : 0;
  return `${prefix}${pad3((Number.isFinite(lastNum) ? lastNum : 0) + 1)}`;
}

async function nextReference(direction: string, commodity: string) {
  const prefix = refPrefix(direction, commodity);

  const last = await prisma.shipment.findFirst({
    where: { reference: { startsWith: prefix } },
    orderBy: { reference: "desc" }, // safe due to pad3
    select: { reference: true },
  });

  const lastNum = last?.reference ? Number(last.reference.split("-")[2]) : 0;
  return `${prefix}${pad3((Number.isFinite(lastNum) ? lastNum : 0) + 1)}`;
}

/**
 * Resolve a currencyId from:
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

  // allow numeric id
  if (typeof cur === "number") return cur;

  const code = clean(cur).toUpperCase();
  const row = await prisma.currency.findUnique({
    where: { currencyCode: code },
    select: { id: true },
  });

  if (!row) {
    throw new Error(
      `Currency '${code}' not found in Currency master. Add it in Currency table and try again.`
    );
  }

  return row.id;
}

const fallbackCode = (city?: string | null) => {
  const c = clean(city);
  if (!c) return "---";
  return c.slice(0, 3).toUpperCase();
};

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const customerId = clean(body.customerId);
    const direction = upper(body.direction, "EXPORT");
    const mode = upper(body.mode, "SEA");
    const commodity = upper(body.commodity, "OTHER");

    if (!customerId || !direction || !mode) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const origin = body.origin || {};
    const destination = body.destination || {};

    const originCity = clean(origin.city);
    const originCountry = clean(origin.country);
    const destCity = clean(destination.city);
    const destCountry = clean(destination.country);

    if (!originCity || !originCountry || !destCity || !destCountry) {
      return new NextResponse("Missing origin/destination city/country", { status: 400 });
    }

    // optional vehicle/driver validation (only if provided)
    const vehicleId = body.vehicleId ? clean(body.vehicleId) : null;
    const driverId = body.driverId ? clean(body.driverId) : null;

    if (vehicleId) {
      const v = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
      if (!v) return new NextResponse("Invalid vehicleId", { status: 400 });
      if (upper((v as any).transportMode, "") !== mode) {
        return new NextResponse("Vehicle mode mismatch", { status: 400 });
      }
    }

    if (driverId) {
      const dr = await prisma.driver.findUnique({ where: { id: driverId } });
      if (!dr) return new NextResponse("Invalid driverId", { status: 400 });
      if (upper((dr as any).transportMode, "") !== mode) {
        return new NextResponse("Driver mode mismatch", { status: 400 });
      }
    }

    const status = upper(body.status, "BOOKED");
    const slaStatus = upper(body.slaStatus, "ON_TIME");

    const financials = body.financials || {};
    const revenue = Number(financials?.revenue ?? 0) || 0;
    const cost = Number(financials?.cost ?? 0) || 0;
    const margin = revenue - cost;

    const currencyId = await resolveCurrencyId(customerId, financials?.currency);
    const invoiceStatus = upper(financials?.invoiceStatus, "DRAFT");

    const incotermId = body.incotermId != null && body.incotermId !== "" ? Number(body.incotermId) : null;
    const containerTypeId = body.containerTypeId != null && body.containerTypeId !== "" ? Number(body.containerTypeId) : null;
    const temperatureId = body.temperatureId != null && body.temperatureId !== "" ? Number(body.temperatureId) : null;

    const originPortId = origin.portId != null && origin.portId !== "" ? Number(origin.portId) : null;
    const destPortId = destination.portId != null && destination.portId !== "" ? Number(destination.portId) : null;

    const items = Array.isArray(body.items) ? body.items : [];

    const year = new Date().getFullYear();

    // retry to avoid collisions in concurrent create
    for (let attempt = 0; attempt < 5; attempt++) {
      const shipmentId = await nextShipmentId(year);

      // ✅ FIX: generate reference if missing/blank OR not provided at all
      const incomingRef = clean(body.reference);
      const finalRef = incomingRef ? incomingRef : await nextReference(direction, commodity);

      try {
        const created = await prisma.shipment.create({
          data: {
            id: shipmentId,
            reference: finalRef,
            masterDoc: clean(body.masterDoc) ? clean(body.masterDoc) : null,

            customerId,
            direction: direction as any,
            mode: mode as any,
            commodity: commodity as any,

            incotermId,
            originCity,
            originCountry,
            originContact: clean(origin.contact) ? clean(origin.contact) : null,
            originPortId,

            destCity,
            destCountry,
            destContact: clean(destination.contact) ? clean(destination.contact) : null,
            destPortId,

            containerTypeId,
            temperatureId,

            status: status as any,
            etd: d(body.etd),
            eta: d(body.eta),
            slaStatus: slaStatus as any,

            vehicleId,
            driverId,

            currencyId,
            revenue,
            cost,
            margin,
            invoiceStatus: invoiceStatus as any,

            items: items.length
              ? {
                  create: items
                    .filter((it: any) => it?.productId)
                    .map((it: any) => ({
                      productId: it.productId,
                      quantity: Number(it.quantity || 0),
                      unit: clean(it.unit) || "Unit",
                      weightKg: it.weightKg != null ? Number(it.weightKg) : null,
                      packaging: clean(it.packaging) ? clean(it.packaging) : null,
                    })),
                }
              : undefined,

            events: {
              create: {
                status: status as any,
                location: originCity || null,
                description: "Shipment created",
                user: "System",
              },
            },
          },
          select: { id: true, reference: true },
        });

        return NextResponse.json(created);
      } catch (e: any) {
        // unique collision (id/reference). retry.
        if (e?.code === "P2002") continue;
        throw e;
      }
    }

    return new NextResponse("Could not generate a unique shipment id/reference", { status: 500 });
  } catch (e: any) {
    return new NextResponse(e?.message || "Create shipment failed", { status: 500 });
  }
}

export async function GET() {
  try {
    // ✅ IMPORTANT: avoid fragile `include: { originPort: ... }` relation names
    const rows = await prisma.shipment.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        reference: true,
        masterDoc: true,
        customerId: true,

        originPortId: true,
        destPortId: true,
        originCity: true,
        originCountry: true,
        destCity: true,
        destCountry: true,

        mode: true,
        direction: true,
        commodity: true,
        status: true,
        slaStatus: true,
        eta: true,

        vehicleId: true,
      },
    });

    const customerIds = Array.from(new Set(rows.map((r) => r.customerId).filter(Boolean)));
    const portIds = Array.from(
      new Set(
        rows
          .flatMap((r) => [r.originPortId, r.destPortId])
          .filter((x): x is number => typeof x === "number")
      )
    );
    const vehicleIds = Array.from(new Set(rows.map((r) => r.vehicleId).filter(Boolean))) as string[];

    const [customers, ports, vehicles] = await Promise.all([
      customerIds.length
        ? prisma.customer.findMany({ where: { id: { in: customerIds } }, select: { id: true, companyName: true } })
        : Promise.resolve([]),
      portIds.length
        ? prisma.port.findMany({ where: { id: { in: portIds } }, select: { id: true, code: true } })
        : Promise.resolve([]),
      vehicleIds.length
        ? prisma.vehicle.findMany({
            where: { id: { in: vehicleIds } },
            include: { drivers: { include: { driver: true } } }, // expects Vehicle.drivers -> VehicleDriver -> driver
          })
        : Promise.resolve([]),
    ]);

    const customerMap = new Map(customers.map((c) => [c.id, c.companyName]));
    const portMap = new Map(ports.map((p) => [p.id, p.code]));

    const vehicleMap = new Map(
      vehicles.map((v: any) => [
        v.id,
        {
          id: v.id,
          name: v.name,
          number: v.number,
          transportMode: v.transportMode,
          assignedDrivers: ((v.drivers || []) as any[])
            .map((vd) => vd?.driver)
            .filter(Boolean)
            .map((dr) => ({ id: dr.id, name: dr.name, contactNumber: dr.contactNumber ?? null })),
        },
      ])
    );

    

    return NextResponse.json(
      rows.map((s) => ({
        id: s.id,
        reference: s.reference || "",
        masterDoc: s.masterDoc || "",
        customer: customerMap.get(s.customerId) || "",

        origin: {
          code: s.originPortId ? portMap.get(s.originPortId) || fallbackCode(s.originCity) : fallbackCode(s.originCity),
          city: s.originCity || "",
          country: s.originCountry || "",
        },
        destination: {
          code: s.destPortId ? portMap.get(s.destPortId) || fallbackCode(s.destCity) : fallbackCode(s.destCity),
          city: s.destCity || "",
          country: s.destCountry || "",
        },

        mode: s.mode,
        direction: s.direction,
        commodity: s.commodity,
        status: s.status,
        slaStatus: s.slaStatus,
        eta: s.eta ? s.eta.toISOString().slice(0, 10) : "",

        vehicle: s.vehicleId ? vehicleMap.get(s.vehicleId) || null : null,
      }))
    );
  } catch (e: any) {
    console.error("GET /api/shipments failed:", e);
    return NextResponse.json({ message: e?.message || "Internal Server Error" }, { status: 500 });
  }
}

// app/api/shipments/[id]/route.ts
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
  SHIPMENT = "SHIPMENT",
}

const clean = (v: any) => String(v ?? "").trim();
const upper = (v: any, fallback: string) => clean(v || fallback).toUpperCase();
const parseDate = (v?: string | null) => (v ? new Date(v) : null);

const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" };
const normalizeParam = (v: string) => clean(decodeURIComponent(v || ""));

type RouteCtx = {
  params: Promise<{ id: string }> | { id: string };
};

function toJson(value: any) {
  return JSON.parse(
    JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
  );
}

async function getParamId(ctx: RouteCtx) {
  const p: any = ctx?.params;
  const obj = typeof p?.then === "function" ? await p : p;
  return normalizeParam(obj?.id || "");
}

const fallbackCode = (city?: string | null) => {
  const c = clean(city);
  if (!c) return "---";
  return c.slice(0, 3).toUpperCase();
};

function defaultLocationForStatus(s: any, shipment: any) {
  const originStages = ["BOOKED", "PICKED_UP", "IN_TRANSIT_ORIGIN", "AT_PORT_ORIGIN", "CUSTOMS_EXPORT", "ON_VESSEL"];
  const isOrigin = originStages.includes(String(s));
  const city = isOrigin ? shipment.originCity : shipment.destCity;
  const country = isOrigin ? shipment.originCountry : shipment.destCountry;
  return city && country ? `${city}, ${country}` : isOrigin ? "Origin" : "Destination";
}

function defaultDescriptionForStatus(s: any) {
  return `Status updated to ${String(s).replaceAll("_", " ").toLowerCase()}`;
}

async function resolveCurrencyId(customerId: string, payloadCurrency: any) {
  let cur: any = payloadCurrency;

  if (cur == null || cur === "") {
    const c = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { currency: true },
    });
    cur = c?.currency || "INR";
  }

  if (typeof cur === "number") return cur;

  const code = clean(cur).toUpperCase();
  const row = await prisma.currency.findUnique({
    where: { currencyCode: code },
    select: { id: true },
  });

  if (!row) {
    throw new Error(`Currency '${code}' not found in Currency master. Add it in Currency table and try again.`);
  }

  return row.id;
}

async function findShipmentRecord(idOrRefRaw: string) {
  const idOrRef = normalizeParam(idOrRefRaw);

  try {
    const s = await prisma.shipment.findUnique({
      where: { id: idOrRef as any },
      include: {
        customer: { select: { companyName: true, currency: true } },
        items: { include: { product: true } },
        documents: true,
        events: { orderBy: { timestamp: "desc" } },
      },
    });
    if (s) return s;
  } catch {}

  if (/^\d+$/.test(idOrRef)) {
    try {
      const s = await prisma.shipment.findUnique({
        where: { id: Number(idOrRef) as any },
        include: {
          customer: { select: { companyName: true, currency: true } },
          items: { include: { product: true } },
          documents: true,
          events: { orderBy: { timestamp: "desc" } },
        },
      });
      if (s) return s;
    } catch {}
  }

  return prisma.shipment.findFirst({
    where: { reference: idOrRef },
    include: {
      customer: { select: { companyName: true, currency: true } },
      items: { include: { product: true } },
      documents: true,
      events: { orderBy: { timestamp: "desc" } },
    },
  });
}

async function shapeShipment(idOrRef: string) {
  const s: any = await findShipmentRecord(idOrRef);
  if (!s) return null;

  const [originPort, destPort, incoterm, containerType, temperature, currency, vehicle, driver, invoices, payments] =
    await Promise.all([
      s.originPortId ? prisma.port.findUnique({ where: { id: s.originPortId } }) : Promise.resolve(null),
      s.destPortId ? prisma.port.findUnique({ where: { id: s.destPortId } }) : Promise.resolve(null),
      s.incotermId ? prisma.incoterm.findUnique({ where: { id: s.incotermId } }) : Promise.resolve(null),
      s.containerTypeId ? prisma.containerType.findUnique({ where: { id: s.containerTypeId } }) : Promise.resolve(null),
      s.temperatureId ? prisma.temperature.findUnique({ where: { id: s.temperatureId } }) : Promise.resolve(null),
      s.currencyId ? prisma.currency.findUnique({ where: { id: s.currencyId } }) : Promise.resolve(null),

      s.vehicleId
        ? prisma.vehicle.findUnique({
            where: { id: s.vehicleId },
            include: { drivers: { include: { driver: true } } },
          })
        : Promise.resolve(null),

      s.driverId ? prisma.driver.findUnique({ where: { id: s.driverId } }) : Promise.resolve(null),

      prisma.shipmentInvoice.findMany({
        where: { shipmentId: s.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          shipmentId: true,
          invoiceNumber: true,
          status: true,
          amount: true,
          currency: true,
          issueDate: true,
          dueDate: true,
          createdAt: true,
        },
      }),

      prisma.payment.findMany({
        where: { shipmentId: s.id },
        orderBy: { date: "desc" },
        select: {
          id: true,
          shipmentId: true,
          invoiceId: true,
          amount: true,
          currency: true,
          method: true,
          transactionNum: true,
          date: true,
          notes: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

  const originCode = (originPort as any)?.code || fallbackCode(s.originCity);
  const destCode = (destPort as any)?.code || fallbackCode(s.destCity);

  return {
    id: s.id,
    reference: s.reference || "",
    masterDoc: s.masterDoc || "",

    customer: s.customer?.companyName || "",

    origin: {
      code: originCode,
      city: s.originCity || "",
      country: s.originCountry || "",
      contact: s.originContact || "",
      portId: s.originPortId || null,
    },
    destination: {
      code: destCode,
      city: s.destCity || "",
      country: s.destCountry || "",
      contact: s.destContact || "",
      portId: s.destPortId || null,
    },

    mode: s.mode,
    direction: s.direction,
    commodity: s.commodity,

    status: s.status,
    slaStatus: s.slaStatus,

    etd: s.etd ? s.etd.toISOString().slice(0, 10) : "",
    eta: s.eta ? s.eta.toISOString().slice(0, 10) : "",

    incoterm: incoterm ? { id: (incoterm as any).id, code: (incoterm as any).code, name: (incoterm as any).name } : null,
    containerType: containerType
      ? { id: (containerType as any).id, code: (containerType as any).code, name: (containerType as any).name }
      : null,

    temperature: temperature
      ? {
          id: (temperature as any).id,
          name: (temperature as any).name,
          range: (temperature as any).range,
          tolerance: (temperature as any).tolerance,
          setPoint: (temperature as any).setPoint,
          unit: (temperature as any).unit,
          alerts: 0,
        }
      : null,

    vehicle: vehicle
      ? {
          id: (vehicle as any).id,
          name: (vehicle as any).name,
          number: (vehicle as any).number,
          transportMode: (vehicle as any).transportMode,
          assignedDrivers: (((vehicle as any).drivers || []) as any[])
            .map((vd: any) => vd?.driver)
            .filter(Boolean)
            .map((dr: any) => ({
              id: dr.id,
              name: dr.name,
              role: dr.role,
              contactNumber: dr.contactNumber ?? null,
            })),
        }
      : null,

    driver: driver
      ? {
          id: (driver as any).id,
          name: (driver as any).name,
          role: (driver as any).role,
          transportMode: (driver as any).transportMode,
          contactNumber: (driver as any).contactNumber ?? null,
          licenseNumber: (driver as any).licenseNumber ?? null,
        }
      : null,

    cargo: (s.items || []).map((it: any) => ({
      id: it.id,
      productId: it.productId,
      productName: it.product?.name || "Product",
      hsCode: it.product?.hsCode || "",
      quantity: it.quantity,
      unit: it.unit,
      weightKg: it.weightKg ?? 0,
      tempReq: (it.product as any)?.temperature || (it.product as any)?.temperatureId || "N/A",
      packaging: it.packaging || "",
    })),

    documents: (s.documents || []).map((doc: any) => ({
      id: doc.id,
      name: doc.name,
      type: doc.type,
      status: doc.status,
      uploadDate: doc.uploadedAt ? doc.uploadedAt.toISOString().slice(0, 10) : undefined,
      expiryDate: doc.expiryDate ? doc.expiryDate.toISOString().slice(0, 10) : undefined,
      fileUrl: doc.fileUrl,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
    })),

    events: (s.events || []).map((e: any) => ({
      id: e.id,
      status: e.status,
      timestamp: e.timestamp.toISOString().replace("T", " ").slice(0, 16),
      location: e.location || "",
      description: e.description || "",
      user: e.user || "",
      proofUrl: e.proofUrl || "",
      proofName: e.proofName || "",
      proofMimeType: e.proofMimeType || "",
      proofFileSize: e.proofFileSize ?? null,
    })),

    invoices: (invoices || []).map((inv: any) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      amount: Number(inv.amount || 0),
      currency: inv.currency || (currency as any)?.currencyCode || s.customer?.currency || "INR",
      issueDate: inv.issueDate ? inv.issueDate.toISOString().slice(0, 10) : "",
      dueDate: inv.dueDate ? inv.dueDate.toISOString().slice(0, 10) : "",
    })),

    payments: (payments || []).map((p: any) => ({
      id: p.id,
      amount: Number(p.amount || 0),
      currency: p.currency || (currency as any)?.currencyCode || s.customer?.currency || "INR",
      date: p.date ? p.date.toISOString().slice(0, 10) : "",
      method: p.method || "",
      transactionNum: p.transactionNum || "",
      status: p.status || "PENDING",
      notes: p.notes || "",
    })),

    financials: {
      currency: (currency as any)?.currencyCode || s.customer?.currency || "INR",
      revenue: s.revenue ?? 0,
      cost: s.cost ?? 0,
      margin: s.margin ?? (Number(s.revenue ?? 0) - Number(s.cost ?? 0)),
      invoiceStatus: s.invoiceStatus || "DRAFT",
    },
  };
}

export async function GET(_: Request, ctx: RouteCtx) {
  try {
    const idOrRef = await getParamId(ctx);
    const shipment = await shapeShipment(idOrRef);
    if (!shipment) return new NextResponse("Not found", { status: 404 });
    return NextResponse.json(shipment, { headers: noStoreHeaders });
  } catch (e: any) {
    console.error("GET /api/shipments/[id] failed:", e);
    return NextResponse.json({ message: e?.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  try {
    const actor = await getActorFromRequest(req);
    if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers: noStoreHeaders });

    const idOrRef = await getParamId(ctx);

    const body = await req.json();
    const existing: any = await findShipmentRecord(idOrRef);
    if (!existing) return new NextResponse("Not found", { status: 404 });

    const id = existing.id;
    const nextMode = body.mode ? upper(body.mode, existing.mode) : existing.mode;
    const nextCustomerId = body.customerId ? clean(body.customerId) : existing.customerId;

    if (body.vehicleId !== undefined && body.vehicleId) {
      const v = await prisma.vehicle.findUnique({ where: { id: clean(body.vehicleId) } });
      if (!v) return new NextResponse("Invalid vehicleId", { status: 400 });
      if (upper((v as any).transportMode, "") !== upper(nextMode, "")) {
        return new NextResponse("Vehicle mode mismatch", { status: 400 });
      }
    }

    if (body.driverId !== undefined && body.driverId) {
      const dr = await prisma.driver.findUnique({ where: { id: clean(body.driverId) } });
      if (!dr) return new NextResponse("Invalid driverId", { status: 400 });
      if (upper((dr as any).transportMode, "") !== upper(nextMode, "")) {
        return new NextResponse("Driver mode mismatch", { status: 400 });
      }
    }

    const data: any = {};

    if (body.masterDoc !== undefined) data.masterDoc = clean(body.masterDoc) ? clean(body.masterDoc) : null;
    if (body.direction !== undefined) data.direction = upper(body.direction, existing.direction);
    if (body.mode !== undefined) data.mode = upper(body.mode, existing.mode);
    if (body.commodity !== undefined) data.commodity = upper(body.commodity, existing.commodity);

    if (body.customerId !== undefined) data.customerId = clean(body.customerId);

    if (body.incotermId !== undefined) data.incotermId = body.incotermId ? Number(body.incotermId) : null;
    if (body.containerTypeId !== undefined) data.containerTypeId = body.containerTypeId ? Number(body.containerTypeId) : null;
    if (body.temperatureId !== undefined) data.temperatureId = body.temperatureId ? Number(body.temperatureId) : null;

    if (body.origin) {
      if (body.origin.city !== undefined) data.originCity = clean(body.origin.city);
      if (body.origin.country !== undefined) data.originCountry = clean(body.origin.country);
      if (body.origin.contact !== undefined) data.originContact = clean(body.origin.contact) ? clean(body.origin.contact) : null;
      if (body.origin.portId !== undefined) data.originPortId = body.origin.portId ? Number(body.origin.portId) : null;
    } else {
      if (body.originCity !== undefined) data.originCity = clean(body.originCity);
      if (body.originCountry !== undefined) data.originCountry = clean(body.originCountry);
      if (body.originContact !== undefined) data.originContact = clean(body.originContact) ? clean(body.originContact) : null;
      if (body.originPortId !== undefined) data.originPortId = body.originPortId ? Number(body.originPortId) : null;
    }

    if (body.destination) {
      if (body.destination.city !== undefined) data.destCity = clean(body.destination.city);
      if (body.destination.country !== undefined) data.destCountry = clean(body.destination.country);
      if (body.destination.contact !== undefined) data.destContact = clean(body.destination.contact) ? clean(body.destination.contact) : null;
      if (body.destination.portId !== undefined) data.destPortId = body.destination.portId ? Number(body.destination.portId) : null;
    } else {
      if (body.destCity !== undefined) data.destCity = clean(body.destCity);
      if (body.destCountry !== undefined) data.destCountry = clean(body.destCountry);
      if (body.destContact !== undefined) data.destContact = clean(body.destContact) ? clean(body.destContact) : null;
      if (body.destPortId !== undefined) data.destPortId = body.destPortId ? Number(body.destPortId) : null;
    }

    const nextStatus = body.status !== undefined ? upper(body.status, existing.status) : null;
    const statusChanged = nextStatus != null && nextStatus !== existing.status;

    if (body.status !== undefined) data.status = nextStatus;
    if (body.etd !== undefined) data.etd = parseDate(body.etd);
    if (body.eta !== undefined) data.eta = parseDate(body.eta);
    if (body.slaStatus !== undefined) data.slaStatus = upper(body.slaStatus, existing.slaStatus);

    if (body.vehicleId !== undefined) data.vehicleId = body.vehicleId ? clean(body.vehicleId) : null;
    if (body.driverId !== undefined) data.driverId = body.driverId ? clean(body.driverId) : null;

    if (body.financials) {
      const revenue = Number(body.financials.revenue ?? 0) || 0;
      const cost = Number(body.financials.cost ?? 0) || 0;

      const currencyId = await resolveCurrencyId(nextCustomerId, body.financials.currency);

      data.currencyId = currencyId;
      data.revenue = revenue;
      data.cost = cost;
      data.margin = revenue - cost;

      if (body.financials.invoiceStatus !== undefined) {
        data.invoiceStatus = upper(body.financials.invoiceStatus, existing.invoiceStatus || "DRAFT");
      }
    }

    if (Array.isArray(body.items)) {
      data.items = {
        deleteMany: {},
        create: body.items
          .filter((it: any) => it?.productId)
          .map((it: any) => ({
            productId: it.productId,
            quantity: Number(it.quantity || 0),
            unit: clean(it.unit) || "Unit",
            weightKg: it.weightKg != null ? Number(it.weightKg) : null,
            packaging: clean(it.packaging) ? clean(it.packaging) : null,
          })),
      };
    }

    if (statusChanged) {
      data.events = {
        create: {
          status: nextStatus,
          location: body.location || defaultLocationForStatus(nextStatus, existing),
          description: body.description || defaultDescriptionForStatus(nextStatus),
          user: body.user || actor.name || "System",
        },
      };
    }

    await prisma.shipment.update({ where: { id }, data });

    const shipment = await shapeShipment(String(id));

    await logAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: AuditAction.UPDATE as any,
      entityType: AuditEntityType.SHIPMENT as any,
      entityId: String(existing.id),
      entityRef: existing.reference || String(existing.id),
      description: `Shipment updated: ${existing.reference || existing.id}`,
      meta: {
        before: toJson({
          id: existing.id,
          reference: existing.reference,
          customerId: existing.customerId,
          direction: existing.direction,
          mode: existing.mode,
          commodity: existing.commodity,
          originCity: existing.originCity,
          originCountry: existing.originCountry,
          destCity: existing.destCity,
          destCountry: existing.destCountry,
          status: existing.status,
          slaStatus: existing.slaStatus,
          etd: existing.etd,
          eta: existing.eta,
          vehicleId: existing.vehicleId,
          driverId: existing.driverId,
          currencyId: existing.currencyId,
          revenue: existing.revenue,
          cost: existing.cost,
          margin: existing.margin,
          invoiceStatus: existing.invoiceStatus,
          itemsCount: existing.items?.length || 0,
        }),
        patchApplied: toJson(data),
        statusChanged,
      },
    });

    return NextResponse.json(shipment, { headers: noStoreHeaders });
  } catch (e: any) {
    console.error("PATCH /api/shipments/[id] failed:", e);
    return NextResponse.json({ message: e?.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  try {
    const actor = await getActorFromRequest(req);
    if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers: noStoreHeaders });

    const idOrRef = await getParamId(ctx);

    const existing: any = await findShipmentRecord(idOrRef);
    if (!existing) return new NextResponse("Not found", { status: 404 });

    await prisma.shipment.delete({ where: { id: existing.id } });

    await logAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: AuditAction.DELETE as any,
      entityType: AuditEntityType.SHIPMENT as any,
      entityId: String(existing.id),
      entityRef: existing.reference || String(existing.id),
      description: `Shipment deleted: ${existing.reference || existing.id}`,
      meta: { deleted: toJson({ id: existing.id, reference: existing.reference, customerId: existing.customerId, status: existing.status }) },
    });

    return NextResponse.json({ success: true }, { headers: noStoreHeaders });
  } catch (e: any) {
    console.error("DELETE /api/shipments/[id] failed:", e);
    return NextResponse.json({ message: e?.message || "Failed to delete shipment" }, { status: 500 });
  }
}

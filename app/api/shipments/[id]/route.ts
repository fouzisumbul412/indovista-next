import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";

type Ctx = { params: { id: string } | Promise<{ id: string }> };

const d = (v: any) => (v ? new Date(v) : null);

/**
 * Resolve currencyId from:
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

  if (typeof cur === "number") return cur;

  const code = String(cur).trim().toUpperCase();
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

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;

  if (!id) return new NextResponse("Missing shipment id", { status: 400 });

  const s = await prisma.shipment.findUnique({
    where: { id },
    include: {
      customer: { select: { companyName: true, currency: true } },
      incoterm: true,
      originPort: true,
      destPort: true,
      containerType: true,
      temperature: true,
      currency: true,
      items: { include: { product: true } },
      documents: true,
      events: { orderBy: { timestamp: "desc" } },
    },
  });

  if (!s) return new NextResponse("Not found", { status: 404 });

  return NextResponse.json({
    id: s.id,
    reference: s.reference,
    masterDoc: s.masterDoc || "",
    customer: s.customer.companyName,
    origin: {
      code: s.originPort?.code || "N/A",
      city: s.originCity,
      country: s.originCountry,
      contact: s.originContact || "",
      portId: s.originPortId || null,
    },
    destination: {
      code: s.destPort?.code || "N/A",
      city: s.destCity,
      country: s.destCountry,
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
    incoterm: s.incoterm
      ? { id: s.incoterm.id, code: s.incoterm.code, name: s.incoterm.name, type: s.incoterm.type }
      : null,
    containerType: s.containerType
      ? { id: s.containerType.id, code: s.containerType.code, name: s.containerType.name }
      : null,
    temperature: s.temperature
      ? {
          id: s.temperature.id,
          name: s.temperature.name,
          range: s.temperature.range,
          tolerance: s.temperature.tolerance,
          setPoint: s.temperature.setPoint,
          unit: s.temperature.unit,
          alerts: 0,
        }
      : { setPoint: 0, unit: "C", range: "", alerts: 0 },

    // add productId for editing cargo
    cargo: s.items.map((it) => ({
      id: it.id,
      productId: it.productId,
      productName: it.product.name,
      hsCode: it.product.hsCode || "",
      quantity: it.quantity,
      unit: it.unit,
      weightKg: it.weightKg || 0,
      tempReq: it.product.temperatureId || "N/A",
      packaging: it.packaging || "",
    })),

    documents: s.documents.map((doc) => ({
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

    events: s.events.map((e) => ({
      id: e.id,
      status: e.status,
      timestamp: e.timestamp.toISOString().replace("T", " ").slice(0, 16),
      location: e.location || "",
      description: e.description || "",
      user: e.user || "",
    })),

    financials: {
      currency: s.currency?.currencyCode || s.customer.currency || "INR",
      revenue: s.revenue,
      cost: s.cost,
      margin: s.margin,
      invoiceStatus: s.invoiceStatus,
    },
  });
}

/**
 * PATCH = partial update (edit shipment, edit cargo, edit financials, etc.)
 */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    if (!id) return new NextResponse("Missing shipment id", { status: 400 });

    const body = await req.json();

    const data: any = {};

    // Basic fields
    if (body.masterDoc !== undefined) data.masterDoc = body.masterDoc || null;
    if (body.direction !== undefined) data.direction = body.direction;
    if (body.mode !== undefined) data.mode = body.mode;
    if (body.commodity !== undefined) data.commodity = body.commodity;

    if (body.customerId !== undefined) data.customerId = body.customerId;

    if (body.incotermId !== undefined) data.incotermId = body.incotermId ? Number(body.incotermId) : null;
    if (body.containerTypeId !== undefined) data.containerTypeId = body.containerTypeId ? Number(body.containerTypeId) : null;
    if (body.temperatureId !== undefined) data.temperatureId = body.temperatureId ? Number(body.temperatureId) : null;

    // Origin / Destination
    if (body.origin) {
      if (body.origin.city !== undefined) data.originCity = body.origin.city;
      if (body.origin.country !== undefined) data.originCountry = body.origin.country;
      if (body.origin.contact !== undefined) data.originContact = body.origin.contact || null;
      if (body.origin.portId !== undefined) data.originPortId = body.origin.portId ? Number(body.origin.portId) : null;
    }

    if (body.destination) {
      if (body.destination.city !== undefined) data.destCity = body.destination.city;
      if (body.destination.country !== undefined) data.destCountry = body.destination.country;
      if (body.destination.contact !== undefined) data.destContact = body.destination.contact || null;
      if (body.destination.portId !== undefined) data.destPortId = body.destination.portId ? Number(body.destination.portId) : null;
    }

    // Status / dates / SLA
    if (body.status !== undefined) data.status = body.status;
    if (body.etd !== undefined) data.etd = d(body.etd);
    if (body.eta !== undefined) data.eta = d(body.eta);
    if (body.slaStatus !== undefined) data.slaStatus = body.slaStatus;

    // Financials
    if (body.financials) {
      const existing = await prisma.shipment.findUnique({
        where: { id },
        select: { customerId: true },
      });
      if (!existing) return new NextResponse("Not found", { status: 404 });

      const revenue = Number(body.financials.revenue ?? 0) || 0;
      const cost = Number(body.financials.cost ?? 0) || 0;
      const margin = revenue - cost;

      const currencyId = await resolveCurrencyId(existing.customerId, body.financials.currency);

      data.currencyId = currencyId;
      data.revenue = revenue;
      data.cost = cost;
      data.margin = margin;
      if (body.financials.invoiceStatus !== undefined) data.invoiceStatus = body.financials.invoiceStatus;
    }

    // Cargo items (replace)
    if (Array.isArray(body.items)) {
      data.items = {
        deleteMany: {},
        create: body.items
          .filter((it: any) => it.productId)
          .map((it: any) => ({
            productId: it.productId,
            quantity: Number(it.quantity || 0),
            unit: it.unit || "Unit",
            weightKg: it.weightKg != null ? Number(it.weightKg) : null,
            packaging: it.packaging || null,
          })),
      };
    }

    const updated = await prisma.shipment.update({
      where: { id },
      data,
      select: { id: true, reference: true },
    });

    return NextResponse.json({ id: updated.id, reference: updated.reference });
  } catch (e: any) {
    return new NextResponse(e?.message || "Update failed", { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    if (!id) return new NextResponse("Missing shipment id", { status: 400 });

    // Delete shipment (items/docs/events cascade)
    await prisma.shipment.delete({ where: { id } });

    // Optional: delete uploaded folder
    const dir = path.join(process.cwd(), "public", "uploads", "shipments", id);
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch {
      // ignore
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return new NextResponse(e?.message || "Delete failed", { status: 500 });
  }
}

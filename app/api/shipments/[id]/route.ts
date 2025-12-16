import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: { id: string } | Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params; // ✅ works whether params is object or Promise

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
      code: s.originPort?.code || "—",
      city: s.originCity,
      country: s.originCountry,
      contact: s.originContact || "",
    },
    destination: {
      code: s.destPort?.code || "—",
      city: s.destCity,
      country: s.destCountry,
      contact: s.destContact || "",
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
    cargo: s.items.map((it) => ({
      id: it.id,
      productName: it.product.name,
      hsCode: it.product.hsCode || "",
      quantity: it.quantity,
      unit: it.unit,
      weightKg: it.weightKg || 0,
      tempReq: it.product.temperature || "—",
      packaging: it.packaging || "",
    })),
    documents: s.documents.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      status: d.status,
      uploadDate: d.uploadedAt ? d.uploadedAt.toISOString().slice(0, 10) : undefined,
      expiryDate: d.expiryDate ? d.expiryDate.toISOString().slice(0, 10) : undefined,
      fileUrl: d.fileUrl,
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

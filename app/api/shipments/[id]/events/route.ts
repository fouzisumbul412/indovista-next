import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } | Promise<{ id: string }> };

async function resolveShipmentId(rawId: string) {
  // Supports both:
  // - Shipment.id (cuid)
  // - Shipment.reference (e.g., SHP-2025-003)
  const shipment = await prisma.shipment.findFirst({
    where: {
      OR: [{ id: rawId }, { reference: rawId }],
    },
    select: { id: true },
  });

  return shipment?.id || null;
}

/**
 * ✅ GET /api/shipments/:id/events
 * Returns events ordered by timestamp desc (latest first)
 */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { id: rawId } = await Promise.resolve(params);
    if (!rawId) return new NextResponse("Missing shipment id", { status: 400 });

    const shipmentId = await resolveShipmentId(rawId);
    if (!shipmentId) return new NextResponse("Shipment not found", { status: 404 });

    const events = await prisma.shipmentEvent.findMany({
      where: { shipmentId },
      orderBy: [{ timestamp: "desc" }],
      select: {
        id: true,
        shipmentId: true,
        status: true,
        timestamp: true,
        location: true,
        description: true,
        user: true,
      },
    });

    return NextResponse.json(events);
  } catch (e: any) {
    return new NextResponse(e?.message || "Failed to fetch events", { status: 500 });
  }
}

/**
 * ✅ POST /api/shipments/:id/events
 * Adds a timeline event + updates shipment.status
 */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const { id: rawId } = await Promise.resolve(params);
    if (!rawId) return new NextResponse("Missing shipment id", { status: 400 });

    const shipmentId = await resolveShipmentId(rawId);
    if (!shipmentId) return new NextResponse("Shipment not found", { status: 404 });

    const body = await req.json().catch(() => ({}));

    const status = body?.status;
    if (!status) return new NextResponse("status is required", { status: 400 });

    // timestamp validation
    const ts = body?.timestamp ? new Date(body.timestamp) : new Date();
    const timestamp = isNaN(ts.getTime()) ? new Date() : ts;

    const location = body?.location || null;
    const description = body?.description || null;
    const user = body?.user || "System";

    const result = await prisma.$transaction(async (tx) => {
      const s = await tx.shipment.update({
        where: { id: shipmentId },
        data: { status },
        select: { id: true },
      });

      const createdEvent = await tx.shipmentEvent.create({
        data: {
          shipmentId,
          status,
          timestamp,
          location,
          description,
          user,
        },
        select: {
          id: true,
          shipmentId: true,
          status: true,
          timestamp: true,
          location: true,
          description: true,
          user: true,
        },
      });

      return { shipmentId: s.id, event: createdEvent };
    });

    return NextResponse.json({ ok: true, shipmentId: result.shipmentId, event: result.event });
  } catch (e: any) {
    return new NextResponse(e?.message || "Status update failed", { status: 500 });
  }
}

// app/api/shipments/[id]/documents/[docId]/route.ts
export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteShipmentDocument } from "@/lib/deleteShipmentDocument";

/* =========================
   UPDATE DOCUMENT METADATA
   ========================= */
export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<"/api/shipments/[id]/documents/[docId]">
) {
  try {
    const { id: shipmentId, docId } = await ctx.params; // ✅ params is async in Next 15+
    const body = await req.json();

    const existing = await prisma.shipmentDocument.findFirst({
      where: { id: docId, shipmentId },
      select: { id: true },
    });

    if (!existing) {
      return new NextResponse("Not found", { status: 404 });
    }

    const updated = await prisma.shipmentDocument.update({
      where: { id: docId },
      data: {
        name: body.name ?? undefined,
        type: body.type ?? undefined,
        status: body.status ?? undefined,
        expiryDate:
          body.expiryDate !== undefined
            ? body.expiryDate
              ? new Date(body.expiryDate)
              : null
            : undefined,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: updated.id });
  } catch (e: any) {
    return new NextResponse(e?.message || "Document update failed", { status: 500 });
  }
}

/* =========================
   DELETE DOCUMENT (BLOB + FS SAFE)
   ========================= */
export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/shipments/[id]/documents/[docId]">
) {
  try {
    const { id: shipmentId, docId } = await ctx.params; // ✅ await params

    const doc = await prisma.shipmentDocument.findFirst({
      where: { id: docId, shipmentId },
      select: { fileUrl: true },
    });

    if (!doc) {
      return new NextResponse("Not found", { status: 404 });
    }

    await prisma.shipmentDocument.delete({
      where: { id: docId },
    });

    if (doc.fileUrl) {
      await deleteShipmentDocument(shipmentId, doc.fileUrl);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return new NextResponse(e?.message || "Document delete failed", { status: 500 });
  }
}

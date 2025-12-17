export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";

type Ctx = {
  params:
    | { id: string; docId: string }
    | Promise<{ id: string; docId: string }>;
};

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id: shipmentId, docId } = await params;
    const body = await req.json();

    const updated = await prisma.shipmentDocument.update({
      where: { id: docId },
      data: {
        shipmentId, // keep correct
        name: body.name !== undefined ? String(body.name || "Document") : undefined,
        type: body.type !== undefined ? body.type : undefined,
        status: body.status !== undefined ? body.status : undefined,
        expiryDate: body.expiryDate !== undefined ? (body.expiryDate ? new Date(body.expiryDate) : null) : undefined,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: updated.id });
  } catch (e: any) {
    return new NextResponse(e?.message || "Document update failed", { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id: shipmentId, docId } = await params;

    const doc = await prisma.shipmentDocument.findUnique({
      where: { id: docId },
      select: { fileUrl: true },
    });

    await prisma.shipmentDocument.delete({ where: { id: docId } });

    // optional file delete (only if inside shipment folder)
    if (doc?.fileUrl) {
      const abs = path.join(process.cwd(), "public", doc.fileUrl);
      // Ensure it belongs to this shipment folder
      const safeRoot = path.join(process.cwd(), "public", "uploads", "shipments", shipmentId);
      if (abs.startsWith(safeRoot)) {
        try {
          await fs.unlink(abs);
        } catch {
          // ignore
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return new NextResponse(e?.message || "Document delete failed", { status: 500 });
  }
}

// app/api/shipments/[id]/documents/[docId]/route.ts
export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteShipmentDocument } from "@/lib/deleteShipmentDocument";
import { getActorFromRequest } from "@/lib/getActor";
import { logAudit } from "@/lib/audit";

enum AuditAction {
  UPDATE = "UPDATE",
  DELETE = "DELETE",
}
enum AuditEntityType {
  DOCUMENT = "DOCUMENT",
}

type Ctx = {
  params: Promise<{ id: string; docId: string }>;
};

function toJson(value: any) {
  return JSON.parse(JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v)));
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const actor = await getActorFromRequest(req);
    if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { id: shipmentId, docId } = await ctx.params;
    const body = await req.json();

    const existing = await prisma.shipmentDocument.findFirst({
      where: { id: docId, shipmentId },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        expiryDate: true,
        fileUrl: true,
      },
    });

    if (!existing) return new NextResponse("Not found", { status: 404 });

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
      select: { id: true, name: true, type: true, status: true, expiryDate: true },
    });

    await logAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: AuditAction.UPDATE as any,
      entityType: AuditEntityType.DOCUMENT as any,
      entityId: docId,
      entityRef: shipmentId,
      description: `Shipment document metadata updated: ${docId}`,
      meta: {
        shipmentId,
        docId,
        before: toJson(existing),
        after: toJson(updated),
        patch: toJson({
          name: body.name,
          type: body.type,
          status: body.status,
          expiryDate: body.expiryDate,
        }),
      },
    });

    return NextResponse.json({ ok: true, id: updated.id });
  } catch (e: any) {
    return new NextResponse(e?.message || "Document update failed", { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const actor = await getActorFromRequest(req);
    if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { id: shipmentId, docId } = await ctx.params;

    const doc = await prisma.shipmentDocument.findFirst({
      where: { id: docId, shipmentId },
      select: { id: true, name: true, type: true, status: true, fileUrl: true, mimeType: true, fileSize: true },
    });

    if (!doc) return new NextResponse("Not found", { status: 404 });

    await prisma.shipmentDocument.delete({ where: { id: docId } });

    if (doc.fileUrl) {
      await deleteShipmentDocument(shipmentId, doc.fileUrl);
    }

    await logAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: AuditAction.DELETE as any,
      entityType: AuditEntityType.DOCUMENT as any,
      entityId: docId,
      entityRef: shipmentId,
      description: `Shipment document deleted: ${docId}`,
      meta: {
        shipmentId,
        docId,
        deleted: toJson(doc),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return new NextResponse(e?.message || "Document delete failed", { status: 500 });
  }
}

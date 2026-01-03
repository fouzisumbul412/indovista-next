// app/api/shipments/[id]/documents/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadShipmentDocument } from "@/lib/uploadShipmentDocument";
import { Document } from "@/types";
import { getActorFromRequest } from "@/lib/getActor";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" };

enum AuditAction {
  CREATE = "CREATE",
}
enum AuditEntityType {
  SHIPMENT_DOCUMENT = "SHIPMENT",
}

async function getParams(ctx: any) {
  return await Promise.resolve(ctx.params);
}

export async function GET(req: NextRequest, ctx: any) {
  try {
    const actor = await getActorFromRequest(req);
    if (!actor)
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401, headers: noStoreHeaders }
      );

    const { id: shipmentId } = await getParams(ctx);

    const docs = await prisma.shipmentDocument.findMany({
      where: { shipmentId },
      orderBy: { uploadedAt: "desc" },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        uploadedAt: true,
        expiryDate: true,
        fileUrl: true,
        mimeType: true,
        fileSize: true,
        shipmentId: true,
      },
    });

    return NextResponse.json(
      docs.map((d: Document) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        status: d.status,
        uploadedAt: d.uploadedAt ? d.uploadedAt.toISOString().slice(0, 10) : "",
        expiryDate: d.expiryDate ? d.expiryDate.toISOString().slice(0, 10) : "",
        fileUrl: d.fileUrl || "",
        mimeType: d.mimeType || "",
        fileSize: d.fileSize ?? null,
        shipmentId: d.shipmentId,
      })),
      { headers: noStoreHeaders }
    );
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message || "Failed to load shipment documents" },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

export async function POST(req: NextRequest, ctx: any) {
  try {
    const actor = await getActorFromRequest(req);
    if (!actor)
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401, headers: noStoreHeaders }
      );

    const { id: shipmentId } = await getParams(ctx);

    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: { id: true, reference: true },
    });
    if (!shipment) {
      return NextResponse.json(
        { message: "Shipment not found" },
        { status: 404, headers: noStoreHeaders }
      );
    }

    const form = await req.formData();

    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { message: "Missing file" },
        { status: 400, headers: noStoreHeaders }
      );
    }

    const name = String(form.get("name") || file.name || "Document");
    const type = String(form.get("type") || "OTHER");
    const status = String(form.get("status") || "DRAFT");

    const expiryDateRaw = form.get("expiryDate");
    const expiryDate =
      expiryDateRaw && String(expiryDateRaw).trim()
        ? new Date(String(expiryDateRaw))
        : null;

    const uploaded = await uploadShipmentDocument(shipmentId, file);

    const created = await prisma.shipmentDocument.create({
      data: {
        shipmentId,
        name,
        type: type as any,
        status: status as any,
        expiryDate,
        fileUrl: uploaded.fileUrl,
        mimeType: uploaded.mimeType,
        fileSize: uploaded.fileSize,
      },
      select: { id: true },
    });

    await logAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: AuditAction.CREATE as any,
      entityType: AuditEntityType.SHIPMENT_DOCUMENT as any,
      entityId: created.id,
      entityRef: shipment.reference || shipmentId,
      description: `Shipment document uploaded: ${name} (${
        shipment.reference || shipmentId
      })`,
      meta: {
        shipmentId,
        shipmentRef: shipment.reference || "",
        documentId: created.id,
        name,
        type,
        status,
        expiryDate,
        fileUrl: uploaded.fileUrl,
        mimeType: uploaded.mimeType,
        fileSize: uploaded.fileSize ?? null,
      },
    });

    return NextResponse.json(created, { headers: noStoreHeaders });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message || "Upload failed" },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

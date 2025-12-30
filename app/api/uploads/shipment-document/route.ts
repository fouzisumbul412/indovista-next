// app/api/uploads/shipment-document/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { uploadShipmentDocument } from "@/lib/uploadShipmentDocument";
import { getActorFromRequest } from "@/lib/getActor";
import { logAudit } from "@/lib/audit";

enum AuditAction {
  CREATE = "CREATE",
}
enum AuditEntityType {
  SHIPMENT_DOCUMENT_UPLOAD = "SHIPMENT_DOCUMENT_UPLOAD",
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getActorFromRequest(req);
    if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const form = await req.formData();
    const shipmentId = String(form.get("shipmentId") || "").trim();
    const file = form.get("file") as File | null;

    if (!shipmentId) return new NextResponse("shipmentId missing", { status: 400 });
    if (!file) return new NextResponse("file missing", { status: 400 });

    const result = await uploadShipmentDocument(shipmentId, file);

    await logAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: AuditAction.CREATE as any,
      entityType: AuditEntityType.SHIPMENT_DOCUMENT_UPLOAD as any,
      entityId: shipmentId,
      entityRef: shipmentId,
      description: `Shipment document uploaded (direct upload endpoint): ${shipmentId}`,
      meta: {
        shipmentId,
        fileName: file.name || "Document",
        mimeType: (result as any)?.mimeType || file.type || "",
        fileSize: (result as any)?.fileSize ?? null,
        fileUrl: (result as any)?.fileUrl || null,
      },
    });

    return NextResponse.json(result);
  } catch (e: any) {
    return new NextResponse(e?.message || "Upload failed", { status: 500 });
  }
}

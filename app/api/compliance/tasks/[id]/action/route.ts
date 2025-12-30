// app/api/compliance/tasks/[id]/action/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getActorFromRequest } from "@/lib/getActor";
import { AuditAction } from "@/lib/generated/prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" };

// ✅ Next.js 16 expects params to be a Promise
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    // ✅ await params
    const { id } = await params;
    if (!id) return new NextResponse("Missing task id", { status: 400 });

    const actor = await getActorFromRequest(req);
    if (!actor) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "").toUpperCase(); // APPROVE | REJECT
    const note = typeof body?.note === "string" ? body.note.trim() : null;

    if (action !== "APPROVE" && action !== "REJECT") {
      return new NextResponse("Invalid action", { status: 400 });
    }

    const updated = await prisma.complianceTask.update({
      where: { id },
      data: {
        status: action === "APPROVE" ? "APPROVED" : "REJECTED",
        decidedAt: new Date(),
        decisionNote: note,
        decidedByUserId: actor.id,
      },
      select: {
        id: true,
        type: true,
        entityType: true,
        entityId: true,
        entityRef: true,
        entityName: true,
        description: true,
        status: true,
      },
    });

    await logAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: action === "APPROVE" ? AuditAction.APPROVE : AuditAction.REJECT,
      entityType: updated.entityType,
      entityId: updated.entityId,
      entityRef: updated.entityRef || updated.entityName,
      description: `${action} compliance task (${updated.type}) for ${updated.entityName}`,
      meta: { taskId: updated.id, taskType: updated.type, note },
    });

    return NextResponse.json(
      { ok: true, task: updated },
      { headers: noStoreHeaders }
    );
  } catch (e: any) {
    console.error("[POST /api/compliance/tasks/:id/action] Error:", e);
    return new NextResponse(e?.message || "Failed to update task", { status: 500 });
  }
}

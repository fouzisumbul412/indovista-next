import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getActorFromRequest } from "@/lib/getActor";
enum AuditAction {
  UPDATE = "UPDATE",
} 
enum AuditEntityType {
  SYSTEM = "SYSTEM",
}

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } | Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const actor = await getActorFromRequest(req);
  if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(ctx.params);

  try {
    const body = await req.json().catch(() => ({}));
    const enabled = !!body.enabled;
    const label = typeof body.label === "string" ? body.label.trim() : undefined;

    // ✅ before snapshot for audit
    const before = await prisma.freightMode.findUnique({
      where: { id: id as any },
      select: { id: true, label: true, enabled: true },
    });
    if (!before) return NextResponse.json({ message: "Freight mode not found" }, { status: 404 });

    const updated = await prisma.freightMode.update({
      where: { id: id as any },
      data: {
        enabled,
        ...(label ? { label } : {}),
      },
      select: { id: true, label: true, enabled: true },
    });

    // ✅ audit log (UPDATE)
    await logAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.SYSTEM, // best fit unless you add FREIGHT_MODE enum
      entityId: updated.id,               // "ROAD" | "SEA" | "AIR"
      entityRef: updated.id,
      description: `Freight mode updated: ${updated.id} enabled=${updated.enabled}${label ? ` label="${updated.label}"` : ""}`,
      meta: { before, after: updated },
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "Failed" }, { status: 500 });
  }
}

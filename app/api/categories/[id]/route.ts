import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getActorFromRequest } from "@/lib/getActor";
import { AuditAction, AuditEntityType } from "@/lib/generated/prisma/browser";

export const dynamic = "force-dynamic";

type StorageType = "AMBIENT" | "CHILLED" | "FROZEN";

function normalizeStorageType(value: any): StorageType {
  if (value === "CHILLED") return "CHILLED";
  if (value === "FROZEN") return "FROZEN";
  return "AMBIENT";
}

function normalizeTemperatureId(value: any): number | null {
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

type RouteContext = {
  params: { id: string } | Promise<{ id: string }>;
};

export async function PUT(req: Request, context: RouteContext) {
  const { id } = await Promise.resolve(context.params);

  try {
    const actor = await getActorFromRequest(req);
    if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    if (!id) return NextResponse.json({ message: "Missing category id" }, { status: 400 });
    if (!body?.name || typeof body.name !== "string") {
      return NextResponse.json({ message: "Category name is required" }, { status: 400 });
    }

    const temperatureId = normalizeTemperatureId(body.temperatureId);

    if (temperatureId != null) {
      const exists = await prisma.temperature.findUnique({
        where: { id: temperatureId },
        select: { id: true },
      });
      if (!exists) {
        return NextResponse.json({ message: "Invalid temperatureId" }, { status: 400 });
      }
    }

    // optional: capture before state for meta
    const before = await prisma.category.findUnique({ where: { id } });

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: body.name,
        hsCode: body.hsCode || null,
        storageType: normalizeStorageType(body.storageType),
        documents: body.documents || null,
        notes: body.notes || null,
        temperatureId,
      },
      include: {
        temperature: {
          select: { id: true, name: true, range: true, tolerance: true, setPoint: true, unit: true },
        },
      },
    });

    await logAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: AuditAction.UPDATE, // ✅ FIXED
      entityType: AuditEntityType.CATEGORY,
      entityId: updated.id,
      entityRef: updated.id,
      description: `Category updated: ${updated.name} (${updated.id})`,
      meta: { before, updated },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("[PUT /api/categories/:id] Error:", error);
    if (error?.code === "P2025") return NextResponse.json({ message: "Category not found" }, { status: 404 });
    return NextResponse.json({ message: "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  const { id } = await Promise.resolve(context.params);

  try {
    const actor = await getActorFromRequest(req);
    if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    if (!id) return NextResponse.json({ message: "Missing category id" }, { status: 400 });

    const deleted = await prisma.category.delete({ where: { id } });

    await logAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: AuditAction.DELETE, // ✅ FIXED
      entityType: AuditEntityType.CATEGORY,
      entityId: id,
      entityRef: id,
      description: `Category deleted: ${deleted.name} (${deleted.id})`,
      meta: { deleted },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/categories/:id] Error:", error);
    if (error?.code === "P2025") return NextResponse.json({ message: "Category not found" }, { status: 404 });
    return NextResponse.json({ message: "Failed to delete category" }, { status: 500 });
  }
}

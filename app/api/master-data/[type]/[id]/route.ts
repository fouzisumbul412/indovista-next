// app/api/master-data/[type]/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getActorFromRequest } from "@/lib/getActor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

enum AuditAction {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
}
enum AuditEntityType {
  MASTER_DATA = "MASTER_DATA",
}

const modelMap: Record<string, any> = {
  ports: prisma.port,
  incoterms: prisma.incoterm,
  "status-codes": prisma.statusCode,
  currencies: prisma.currency,
  "temp-presets": prisma.temperature,
  containers: prisma.containerType,
};

type RouteContext = {
  params: Promise<{ type: string; id: string }>;
};

function toJson(value: any) {
  return JSON.parse(
    JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
  );
}

function looksNumeric(id: string) {
  return /^[0-9]+$/.test(id);
}

// try number id (when numeric), else string id
async function findById(model: any, rawId: string) {
  if (looksNumeric(rawId)) {
    try {
      return await model.findUnique({ where: { id: Number(rawId) } });
    } catch {}
  }
  return await model.findUnique({ where: { id: rawId } });
}
async function updateById(model: any, rawId: string, data: any) {
  if (looksNumeric(rawId)) {
    try {
      return await model.update({ where: { id: Number(rawId) }, data });
    } catch {}
  }
  return await model.update({ where: { id: rawId }, data });
}
async function deleteById(model: any, rawId: string) {
  if (looksNumeric(rawId)) {
    try {
      return await model.delete({ where: { id: Number(rawId) } });
    } catch {}
  }
  return await model.delete({ where: { id: rawId } });
}

// DELETE /api/master-data/:type/:id
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const actor = await getActorFromRequest(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { type, id } = await context.params;
    const model = modelMap[type];
    const rawId = String(id || "").trim();

    if (!model) return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    if (!rawId) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const before = await findById(model, rawId);
    if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const deleted = await deleteById(model, rawId);

    await logAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: AuditAction.DELETE as any,
      entityType: AuditEntityType.MASTER_DATA as any,
      entityId: String(before?.id ?? rawId),
      entityRef: `${type}:${String(before?.id ?? rawId)}`,
      description: `Master-data deleted: type=${type} id=${String(before?.id ?? rawId)}`,
      meta: { type, deleted: toJson(deleted) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/master-data/[type]/[id]] Error:", error);
    return NextResponse.json({ error: "Server error while deleting record" }, { status: 500 });
  }
}

// PUT /api/master-data/:type/:id
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const actor = await getActorFromRequest(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { type, id } = await context.params;
    const model = modelMap[type];
    const rawId = String(id || "").trim();

    if (!model) return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    if (!rawId) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const before = await findById(model, rawId);
    if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const updated = await updateById(model, rawId, body);

    await logAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: AuditAction.UPDATE as any,
      entityType: AuditEntityType.MASTER_DATA as any,
      entityId: String(updated?.id ?? rawId),
      entityRef: `${type}:${String(updated?.id ?? rawId)}`,
      description: `Master-data updated: type=${type} id=${String(updated?.id ?? rawId)}`,
      meta: { type, before: toJson(before), after: toJson(updated) },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PUT /api/master-data/[type]/[id]] Error:", error);
    return NextResponse.json({ error: "Server error while updating record" }, { status: 500 });
  }
}

// app/api/master-data/[type]/route.ts
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
  params: Promise<{ type: string }>;
};

function toJson(value: any) {
  return JSON.parse(
    JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
  );
}

// GET /api/master-data/:type
export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { type } = await context.params;
    const model = modelMap[type];

    if (!model) return NextResponse.json([]);

    const data = await model.findMany({ orderBy: { id: "asc" } });
    return NextResponse.json(data);
  } catch (error) {
    console.error("[GET /api/master-data/[type]] Error:", error);
    return NextResponse.json({ error: "Server error while fetching master data" }, { status: 500 });
  }
}

// POST /api/master-data/:type
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const actor = await getActorFromRequest(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { type } = await context.params;
    const model = modelMap[type];

    if (!model) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const body = await req.json();

    // Bulk create (array)
    if (Array.isArray(body)) {
      // create each row so you get the created records back (createMany only returns count)
      const created = await prisma.$transaction(body.map((item) => model.create({ data: item })));

      await logAudit({
        actorUserId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        action: AuditAction.CREATE as any,
        entityType: AuditEntityType.MASTER_DATA as any,
        entityId: `${type}`,
        entityRef: `${type}`,
        description: `Master-data bulk created: type=${type} count=${created.length}`,
        meta: { type, count: created.length, created: toJson(created) },
      });

      return NextResponse.json(created, { status: 201 });
    }

    // Single create
    const created = await model.create({ data: body });

    await logAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: AuditAction.CREATE as any,
      entityType: AuditEntityType.MASTER_DATA as any,
      entityId: String(created?.id ?? ""),
      entityRef: `${type}:${String(created?.id ?? "")}`,
      description: `Master-data created: type=${type} id=${String(created?.id ?? "")}`,
      meta: { type, created: toJson(created) },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("[POST /api/master-data/[type]] Error:", error);
    return NextResponse.json({ error: "Server error while creating record" }, { status: 500 });
  }
}

// app/api/master-data/[type]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getActorFromRequest } from "@/lib/getActor";
import {
  AuditAction,
  AuditEntityType,
} from "@/lib/generated/prisma/enums";

export const dynamic = "force-dynamic";
export const revalidate = 0;
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
    JSON.stringify(value, (_k, v) =>
      typeof v === "bigint" ? v.toString() : v
    )
  );
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { type } = await context.params;
    const model = modelMap[type];

    if (!model) {
      return NextResponse.json([], { status: 200 });
    }

    const data = await model.findMany({ orderBy: { id: "asc" } });
    return NextResponse.json(data);
  } catch (err) {
    console.error("[GET master-data]", err);
    return NextResponse.json(
      { error: "Server error while fetching master data" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const actor = await getActorFromRequest(req);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type } = await context.params;
    const model = modelMap[type];

    if (!model) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const body = await req.json();

    if (Array.isArray(body)) {
      const created = await prisma.$transaction(
        body.map((item) => model.create({ data: item }))
      );

      await logAudit({
        actorUserId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        action: AuditAction.CREATE,
        entityType: AuditEntityType.SYSTEM,
        entityId: type,
        entityRef: type,
        description: `Master-data bulk created: type=${type} count=${created.length}`,
        meta: {
          type,
          count: created.length,
          created: toJson(created),
        },
      });

      return NextResponse.json(created, { status: 201 });
    }

    const created = await model.create({ data: body });

    await logAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: AuditAction.CREATE,
      entityType: AuditEntityType.SYSTEM,
      entityId: String(created.id),
      entityRef: `${type}:${created.id}`,
      description: `Master-data created: type=${type} id=${created.id}`,
      meta: { type, created: toJson(created) },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("[POST master-data]", err);
    return NextResponse.json(
      { error: "Server error while creating record" },
      { status: 500 }
    );
  }
}

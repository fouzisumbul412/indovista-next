import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getActorFromRequest } from "@/lib/getActor";
import {
  AuditAction,
  AuditEntityType,
} from "@/lib/generated/prisma/enums";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ---------------- types ---------------- */

type IdKind = "int" | "string";

type RouteContext = {
  params: Promise<{ type: string; id: string }>;
};

const modelMap: Record<string, { model: any; idType: IdKind }> = {
  ports: { model: prisma.port, idType: "int" },
  incoterms: { model: prisma.incoterm, idType: "int" },
  "status-codes": { model: prisma.statusCode, idType: "int" },
  currencies: { model: prisma.currency, idType: "int" },
  "temp-presets": { model: prisma.temperature, idType: "int" },
  containers: { model: prisma.containerType, idType: "int" },
};

/* ---------------- utils ---------------- */

function parseId(rawId: string, idType: IdKind): number | string {
  if (idType === "int") {
    const n = Number(rawId);
    if (!Number.isInteger(n)) {
      throw new Error("Invalid numeric id");
    }
    return n;
  }
  return rawId;
}

function toJson(value: any) {
  return JSON.parse(
    JSON.stringify(value, (_k, v) =>
      typeof v === "bigint" ? v.toString() : v
    )
  );
}

/* ---------------- DELETE ---------------- */

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const actor = await getActorFromRequest(req);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, id } = await context.params;
    const entry = modelMap[type];
    if (!entry) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const parsedId = parseId(String(id).trim(), entry.idType);

    const before = await entry.model.findUnique({
      where: { id: parsedId },
    });

    if (!before) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    try {
      const deleted = await entry.model.delete({
        where: { id: parsedId },
      });

      await logAudit({
        actorUserId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        action: AuditAction.DELETE,
        entityType: AuditEntityType.SYSTEM,
        entityId: String(before.id),
        entityRef: `${type}:${before.id}`,
        description: `Master-data deleted: type=${type} id=${before.id}`,
        meta: { type, deleted: toJson(deleted) },
      });

      return NextResponse.json({ success: true });
    } catch (err) {
      // 🔒 FK constraint violation (record is in use)
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2003"
      ) {
        return NextResponse.json(
          {
            error:
              "Cannot delete this record because it is used in existing data.",
          },
          { status: 409 } // Conflict
        );
      }

      throw err;
    }
  } catch (err) {
    console.error("[DELETE master-data]", err);
    return NextResponse.json(
      { error: "Server error while deleting record" },
      { status: 500 }
    );
  }
}

/* ---------------- PUT ---------------- */

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const actor = await getActorFromRequest(req);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, id } = await context.params;
    const entry = modelMap[type];
    if (!entry) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const parsedId = parseId(String(id).trim(), entry.idType);
    const body = await req.json();

    const before = await entry.model.findUnique({
      where: { id: parsedId },
    });

    if (!before) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await entry.model.update({
      where: { id: parsedId },
      data: body,
    });

    await logAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.SYSTEM,
      entityId: String(updated.id),
      entityRef: `${type}:${updated.id}`,
      description: `Master-data updated: type=${type} id=${updated.id}`,
      meta: {
        type,
        before: toJson(before),
        after: toJson(updated),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PUT master-data]", err);
    return NextResponse.json(
      { error: "Server error while updating record" },
      { status: 500 }
    );
  }
}

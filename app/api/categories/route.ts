import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getActorFromRequest } from "@/lib/getActor";
import { AuditAction, AuditEntityType } from "@/lib/generated/prisma/client";

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

async function generateCategoryId(): Promise<string> {
  const last = await prisma.category.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (!last) return "CAT-001";

  const match = last.id.match(/CAT-(\d+)/);
  if (!match) return "CAT-001";

  const num = parseInt(match[1], 10) + 1;
  return `CAT-${num.toString().padStart(3, "0")}`;
}

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        temperature: {
          select: { id: true, name: true, range: true, tolerance: true, setPoint: true, unit: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("[GET /api/categories] Error:", error);
    return NextResponse.json({ message: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const actor = await getActorFromRequest(req);
    if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    if (!body?.name || typeof body.name !== "string") {
      return NextResponse.json({ message: "Category name is required" }, { status: 400 });
    }

    const id =
      typeof body.id === "string" && body.id.trim()
        ? body.id.trim()
        : await generateCategoryId();

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

    const created = await prisma.category.create({
      data: {
        id,
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
      action: AuditAction.CREATE,
      entityType: AuditEntityType.CATEGORY,
      entityId: created.id,
      entityRef: created.id,
      description: `Category created: ${created.name} (${created.id})`,
      meta: { created },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("[POST /api/categories] Error:", error);
    return NextResponse.json({ message: "Failed to create category" }, { status: 500 });
  }
}

// app/api/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getActorFromRequest } from "@/lib/getActor";

export const dynamic = "force-dynamic";

enum AuditAction {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
}
enum AuditEntityType {
  PRODUCT = "PRODUCT",
}

type ProductType = "FROZEN" | "SPICE";

function normalizeType(value: any): ProductType {
  const v = String(value || "").toUpperCase();
  return v === "SPICE" ? "SPICE" : "FROZEN";
}

function normalizeTemperatureId(value: any): number | null {
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeUnitPrice(value: any): number | null {
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeCurrencyCode(value: any): string {
  const v = String(value || "").trim().toUpperCase();
  return v || "INR";
}

function toJson(value: any) {
  return JSON.parse(
    JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
  );
}

async function generateProductId(): Promise<string> {
  const last = await prisma.product.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (!last) return "PROD-001";

  const match = last.id.match(/PROD-(\d+)/);
  if (!match) return "PROD-001";

  const num = parseInt(match[1], 10) + 1;
  return `PROD-${num.toString().padStart(3, "0")}`;
}

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: { select: { id: true, name: true } },
        temperature: { select: { id: true, name: true, range: true, tolerance: true, setPoint: true, unit: true } },
        currency: { select: { currencyCode: true, name: true, exchangeRate: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("[GET /api/products] Error:", error);
    return NextResponse.json({ message: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getActorFromRequest(req);
    if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    if (!body?.name || typeof body.name !== "string") {
      return NextResponse.json({ message: "Product name is required" }, { status: 400 });
    }
    if (!body?.categoryId || typeof body.categoryId !== "string") {
      return NextResponse.json({ message: "categoryId is required" }, { status: 400 });
    }

    const category = await prisma.category.findUnique({
      where: { id: body.categoryId },
      select: { id: true, temperatureId: true },
    });
    if (!category) {
      return NextResponse.json({ message: "Invalid categoryId" }, { status: 400 });
    }

    const requestedTempId = normalizeTemperatureId(body.temperatureId);
    const finalTempId = requestedTempId ?? category.temperatureId ?? null;

    if (finalTempId != null) {
      const exists = await prisma.temperature.findUnique({
        where: { id: finalTempId },
        select: { id: true },
      });
      if (!exists) return NextResponse.json({ message: "Invalid temperatureId" }, { status: 400 });
    }

    const finalCurrencyCode = normalizeCurrencyCode(body.currencyCode);
    const currencyExists = await prisma.currency.findUnique({
      where: { currencyCode: finalCurrencyCode },
      select: { currencyCode: true },
    });
    if (!currencyExists) {
      return NextResponse.json({ message: "Invalid currencyCode" }, { status: 400 });
    }

    const id =
      typeof body.id === "string" && body.id.trim()
        ? body.id.trim()
        : await generateProductId();

    const created = await prisma.product.create({
      data: {
        id,
        name: body.name,
        type: normalizeType(body.type),

        hsCode: body.hsCode || null,
        packSize: body.packSize || null,
        shelfLife: body.shelfLife || null,

        unitPrice: normalizeUnitPrice(body.unitPrice),
        currencyCode: finalCurrencyCode,

        unitsPerCarton: body.unitsPerCarton === "" || body.unitsPerCarton == null ? null : Number(body.unitsPerCarton),
        cartonsPerPallet: body.cartonsPerPallet === "" || body.cartonsPerPallet == null ? null : Number(body.cartonsPerPallet),

        notes: body.notes || null,

        categoryId: body.categoryId,
        temperatureId: finalTempId,
      },
      include: {
        category: { select: { id: true, name: true } },
        temperature: { select: { id: true, name: true, range: true, tolerance: true, setPoint: true, unit: true } },
        currency: { select: { currencyCode: true, name: true, exchangeRate: true } },
      },
    });

    await logAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: AuditAction.CREATE as any,
      entityType: AuditEntityType.PRODUCT as any,
      entityId: created.id,
      entityRef: created.name,
      description: `Product created: ${created.name} (${created.id}) type=${created.type}`,
      meta: { created: toJson(created) },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("[POST /api/products] Error:", error);
    return NextResponse.json({ message: "Failed to create product" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("[GET /api/products] Error:", error);
    return NextResponse.json({ message: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    if (!body?.name || typeof body.name !== "string") {
      return NextResponse.json({ message: "Product name is required" }, { status: 400 });
    }
    if (!body?.categoryId || typeof body.categoryId !== "string") {
      return NextResponse.json({ message: "categoryId is required" }, { status: 400 });
    }

    // ✅ fetch category + its temperatureId (for defaulting)
    const category = await prisma.category.findUnique({
      where: { id: body.categoryId },
      select: { id: true, temperatureId: true },
    });

    if (!category) {
      return NextResponse.json({ message: "Invalid categoryId" }, { status: 400 });
    }

    // ✅ if product temperatureId not provided -> inherit from category
    const requestedTempId = normalizeTemperatureId(body.temperatureId);
    const finalTempId = requestedTempId ?? category.temperatureId ?? null;

    if (finalTempId != null) {
      const exists = await prisma.temperature.findUnique({
        where: { id: finalTempId },
        select: { id: true },
      });
      if (!exists) {
        return NextResponse.json({ message: "Invalid temperatureId" }, { status: 400 });
      }
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

        unitsPerCarton:
          body.unitsPerCarton === "" || body.unitsPerCarton == null ? null : Number(body.unitsPerCarton),
        cartonsPerPallet:
          body.cartonsPerPallet === "" || body.cartonsPerPallet == null ? null : Number(body.cartonsPerPallet),

        notes: body.notes || null,

        categoryId: body.categoryId,
        temperatureId: finalTempId,
      },
      include: {
        category: { select: { id: true, name: true } },
        temperature: { select: { id: true, name: true, range: true, tolerance: true, setPoint: true, unit: true } },
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("[POST /api/products] Error:", error);
    return NextResponse.json({ message: "Failed to create product" }, { status: 500 });
  }
}

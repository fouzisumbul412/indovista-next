// import {NextRequest,  NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";

// export const dynamic = "force-dynamic";

// type ProductType = "FROZEN" | "SPICE";

// function normalizeType(value: any): ProductType {
//   const v = String(value || "").toUpperCase();
//   return v === "SPICE" ? "SPICE" : "FROZEN";
// }

// function normalizeTemperatureId(value: any): number | null {
//   if (value === "" || value == null) return null;
//   const n = Number(value);
//   return Number.isFinite(n) ? n : null;
// }

// function normalizeUnitPrice(value: any): number | null {
//   if (value === "" || value == null) return null;
//   const n = Number(value);
//   return Number.isFinite(n) ? n : null;
// }

// function normalizeCurrencyCode(value: any): string {
//   const v = String(value || "").trim().toUpperCase();
//   return v || "INR";
// }

// type RouteContext = {
//   params: { id: string } | Promise<{ id: string }>;
// };

// export async function PUT(req: Request, context: RouteContext) {
//   const { id } = await Promise.resolve(context.params);

//   try {
//     const body = await req.json().catch(() => ({}));

//     if (!id) return NextResponse.json({ message: "Missing product id" }, { status: 400 });
//     if (!body?.name || typeof body.name !== "string") {
//       return NextResponse.json({ message: "Product name is required" }, { status: 400 });
//     }
//     if (!body?.categoryId || typeof body.categoryId !== "string") {
//       return NextResponse.json({ message: "categoryId is required" }, { status: 400 });
//     }

//     const category = await prisma.category.findUnique({
//       where: { id: body.categoryId },
//       select: { id: true, temperatureId: true },
//     });
//     if (!category) return NextResponse.json({ message: "Invalid categoryId" }, { status: 400 });

//     const requestedTempId = normalizeTemperatureId(body.temperatureId);
//     const finalTempId = requestedTempId ?? category.temperatureId ?? null;

//     if (finalTempId != null) {
//       const exists = await prisma.temperature.findUnique({
//         where: { id: finalTempId },
//         select: { id: true },
//       });
//       if (!exists) return NextResponse.json({ message: "Invalid temperatureId" }, { status: 400 });
//     }

//     // ✅ currency
//     const finalCurrencyCode = normalizeCurrencyCode(body.currencyCode);
//     const currencyExists = await prisma.currency.findUnique({
//       where: { currencyCode: finalCurrencyCode },
//       select: { currencyCode: true },
//     });
//     if (!currencyExists) {
//       return NextResponse.json({ message: "Invalid currencyCode" }, { status: 400 });
//     }

//     const updated = await prisma.product.update({
//       where: { id },
//       data: {
//         name: body.name,
//         type: normalizeType(body.type),

//         hsCode: body.hsCode || null,
//         packSize: body.packSize || null,
//         shelfLife: body.shelfLife || null,

//         unitPrice: normalizeUnitPrice(body.unitPrice),
//         currencyCode: finalCurrencyCode,

//         unitsPerCarton: body.unitsPerCarton === "" || body.unitsPerCarton == null ? null : Number(body.unitsPerCarton),
//         cartonsPerPallet: body.cartonsPerPallet === "" || body.cartonsPerPallet == null ? null : Number(body.cartonsPerPallet),

//         notes: body.notes || null,

//         categoryId: body.categoryId,
//         temperatureId: finalTempId,
//       },
//       include: {
//         category: { select: { id: true, name: true } },
//         temperature: { select: { id: true, name: true, range: true, tolerance: true, setPoint: true, unit: true } },
//         currency: { select: { currencyCode: true, name: true, exchangeRate: true } },
//       },
//     });

//     return NextResponse.json(updated);
//   } catch (error: any) {
//     console.error("[PUT /api/products/:id] Error:", error);
//     if (error?.code === "P2025") return NextResponse.json({ message: "Product not found" }, { status: 404 });
//     return NextResponse.json({ message: "Failed to update product" }, { status: 500 });
//   }
// }

// export async function DELETE(_req: Request, context: RouteContext) {
//   const { id } = await Promise.resolve(context.params);

//   try {
//     if (!id) return NextResponse.json({ message: "Missing product id" }, { status: 400 });

//     await prisma.product.delete({ where: { id } });

//     return NextResponse.json({ success: true });
//   } catch (error: any) {
//     console.error("[DELETE /api/products/:id] Error:", error);
//     if (error?.code === "P2025") return NextResponse.json({ message: "Product not found" }, { status: 404 });
//     return NextResponse.json({ message: "Failed to delete product" }, { status: 500 });
//   }
// }

import { NextRequest, NextResponse } from "next/server";
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

function normalizeUnitPrice(value: any): number | null {
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeCurrencyCode(value: any): string {
  const v = String(value || "").trim().toUpperCase();
  return v || "INR";
}
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const id = body?.id;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ message: "Missing product id" }, { status: 400 });
    }

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
      if (!exists) {
        return NextResponse.json({ message: "Invalid temperatureId" }, { status: 400 });
      }
    }

    const finalCurrencyCode = normalizeCurrencyCode(body.currencyCode);
    const currencyExists = await prisma.currency.findUnique({
      where: { currencyCode: finalCurrencyCode },
      select: { currencyCode: true },
    });

    if (!currencyExists) {
      return NextResponse.json({ message: "Invalid currencyCode" }, { status: 400 });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: body.name,
        type: normalizeType(body.type),
        hsCode: body.hsCode || null,
        packSize: body.packSize || null,
        shelfLife: body.shelfLife || null,
        unitPrice: normalizeUnitPrice(body.unitPrice),
        currencyCode: finalCurrencyCode,
        unitsPerCarton:
          body.unitsPerCarton === "" || body.unitsPerCarton == null
            ? null
            : Number(body.unitsPerCarton),
        cartonsPerPallet:
          body.cartonsPerPallet === "" || body.cartonsPerPallet == null
            ? null
            : Number(body.cartonsPerPallet),
        notes: body.notes || null,
        categoryId: body.categoryId,
        temperatureId: finalTempId,
      },
      include: {
        category: { select: { id: true, name: true } },
        temperature: {
          select: {
            id: true,
            name: true,
            range: true,
            tolerance: true,
            setPoint: true,
            unit: true,
          },
        },
        currency: { select: { currencyCode: true, name: true, exchangeRate: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("[PUT /api/products/export] Error:", error);
    if (error?.code === "P2025") {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Failed to update product" }, { status: 500 });
  }
}
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = body?.id;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ message: "Missing product id" }, { status: 400 });
    }

    await prisma.product.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/products/export] Error:", error);
    if (error?.code === "P2025") {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Failed to delete product" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
type Ctx = { params: { id: string } | Promise<{ id: string }> };

type TransportMode = "ROAD" | "SEA" | "AIR";
type VehicleOwnership = "OWN" | "RENT";
type FuelType = "PETROL" | "DIESEL" | "CNG" | "LPG" | "ELECTRIC" | "OTHER";

function normalizeMode(v: any): TransportMode {
  const x = String(v || "").toUpperCase();
  if (x === "SEA") return "SEA";
  if (x === "AIR") return "AIR";
  return "ROAD";
}
function normalizeOwnership(v: any): VehicleOwnership {
  const x = String(v || "").toUpperCase();
  return x === "RENT" ? "RENT" : "OWN";
}
function normalizeFuel(v: any): FuelType {
  const x = String(v || "").toUpperCase();
  if (["PETROL","DIESEL","CNG","LPG","ELECTRIC","OTHER"].includes(x)) return x as FuelType;
  return "DIESEL";
}

export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await Promise.resolve(ctx.params);

  try {
    const body = await req.json().catch(() => ({}));
    if (!id) return NextResponse.json({ message: "Missing vehicle id" }, { status: 400 });

    if (!body?.name) return NextResponse.json({ message: "Vehicle name is required" }, { status: 400 });
    if (!body?.number) return NextResponse.json({ message: "Vehicle number is required" }, { status: 400 });

    const transportMode = normalizeMode(body.transportMode);
    const ownership = normalizeOwnership(body.ownership);
    const fuel = normalizeFuel(body.fuel);

    if (fuel === "OTHER" && !body.fuelOther) {
      return NextResponse.json({ message: "fuelOther is required when fuel=OTHER" }, { status: 400 });
    }

    const driverIds: string[] = Array.isArray(body.driverIds) ? body.driverIds : [];

    const updated = await prisma.$transaction(async (tx) => {
      const v = await tx.vehicle.update({
        where: { id },
        data: {
          name: body.name,
          number: body.number,
          ownership,

          engineType: body.engineType || null,
          fuel,
          fuelOther: body.fuelOther || null,
          fuelCapacity: body.fuelCapacity == null || body.fuelCapacity === "" ? null : Number(body.fuelCapacity),
          loadingCapacity: body.loadingCapacity == null || body.loadingCapacity === "" ? null : Number(body.loadingCapacity),

          rcNumber: body.rcNumber || null,
          rcExpiry: body.rcExpiry ? new Date(body.rcExpiry) : null,
          pollutionExpiry: body.pollutionExpiry ? new Date(body.pollutionExpiry) : null,

          isRegistered: body.isRegistered ?? true,
          registeredAt: body.registeredAt ? new Date(body.registeredAt) : null,

          docs: body.docs || null,
          transportMode,

          managingVehicle: body.managingVehicle || null,
          medicalSupport: body.medicalSupport || null,
          notes: body.notes || null,
        },
      });

      // reset assignments
      await tx.vehicleDriver.deleteMany({ where: { vehicleId: id } });
      if (driverIds.length) {
        await tx.vehicleDriver.createMany({
          data: driverIds.map((driverId) => ({ vehicleId: id, driverId })),
          skipDuplicates: true,
        });
      }

      return v;
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "Failed to update vehicle" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await Promise.resolve(ctx.params);

  try {
    await prisma.vehicle.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "Failed to delete vehicle" }, { status: 500 });
  }
}

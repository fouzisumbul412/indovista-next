import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

async function generateVehicleId(): Promise<string> {
  const last = await prisma.vehicle.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!last) return "VEH-001";
  const m = last.id.match(/VEH-(\d+)/);
  if (!m) return "VEH-001";
  const num = parseInt(m[1], 10) + 1;
  return `VEH-${String(num).padStart(3, "0")}`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode"); // ROAD/SEA/AIR optional

    const rows = await prisma.vehicle.findMany({
      where: mode ? { transportMode: normalizeMode(mode) } : undefined,
      include: {
        drivers: { include: { driver: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // flatten drivers for UI convenience
    const shaped = rows.map((v) => ({
      ...v,
      assignedDrivers: v.drivers.map((x) => x.driver),
    }));

    return NextResponse.json(shaped);
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "Failed to fetch vehicles" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    if (!body?.name) return NextResponse.json({ message: "Vehicle name is required" }, { status: 400 });
    if (!body?.number) return NextResponse.json({ message: "Vehicle number is required" }, { status: 400 });

    const id = typeof body.id === "string" && body.id.trim() ? body.id.trim() : await generateVehicleId();

    const transportMode = normalizeMode(body.transportMode);
    const ownership = normalizeOwnership(body.ownership);
    const fuel = normalizeFuel(body.fuel);

    if (fuel === "OTHER" && !body.fuelOther) {
      return NextResponse.json({ message: "fuelOther is required when fuel=OTHER" }, { status: 400 });
    }

    const driverIds: string[] = Array.isArray(body.driverIds) ? body.driverIds : [];

    // validate drivers exist (optional)
    if (driverIds.length) {
      const count = await prisma.driver.count({ where: { id: { in: driverIds } } });
      if (count !== driverIds.length) {
        return NextResponse.json({ message: "One or more driverIds are invalid" }, { status: 400 });
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const v = await tx.vehicle.create({
        data: {
          id,
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

      if (driverIds.length) {
        await tx.vehicleDriver.createMany({
          data: driverIds.map((driverId) => ({ vehicleId: v.id, driverId })),
          skipDuplicates: true,
        });
      }

      return v;
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "Failed to create vehicle" }, { status: 500 });
  }
}

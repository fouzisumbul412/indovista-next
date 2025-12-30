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
  if (["PETROL", "DIESEL", "CNG", "LPG", "ELECTRIC", "OTHER"].includes(x)) return x as FuelType;
  return "DIESEL";
}
function normalizeVehicleNumber(v: any): string {
  return String(v || "").trim().toUpperCase();
}
function normalizeName(v: any): string {
  return String(v || "").trim();
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
    const mode = url.searchParams.get("mode");

    const vehicles = await prisma.vehicle.findMany({
      where: mode ? { transportMode: normalizeMode(mode) } : undefined,
      orderBy: { updatedAt: "desc" },
      include: {
        drivers: { include: { driver: true } },
        _count: { select: { shipments: true } },
      },
    });

    const shaped = vehicles.map((v: any) => ({
      id: v.id,
      name: v.name,
      number: v.number,
      transportMode: v.transportMode,
      ownership: v.ownership,
      engineType: v.engineType,
      fuel: v.fuel,
      fuelOther: v.fuelOther,
      fuelCapacity: v.fuelCapacity,
      loadingCapacity: v.loadingCapacity,
      rcNumber: v.rcNumber,
      rcExpiry: v.rcExpiry,
      pollutionExpiry: v.pollutionExpiry,
      isRegistered: v.isRegistered,
      registeredAt: v.registeredAt,
      docs: v.docs,
      managingVehicle: v.managingVehicle,
      medicalSupport: v.medicalSupport,
      notes: v.notes,

      assignedDrivers: (v.drivers || []).map((vd: any) => ({
        id: vd.driver.id,
        name: vd.driver.name,
        role: vd.driver.role,
        contactNumber: vd.driver.contactNumber,
        licenseNumber: vd.driver.licenseNumber,
        transportMode: vd.driver.transportMode,
      })),

      shipmentsCount: v._count?.shipments ?? 0,
    }));

    return NextResponse.json(shaped);
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "Failed to fetch vehicles" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const name = normalizeName(body?.name);
    const number = normalizeVehicleNumber(body?.number);

    if (!name) return NextResponse.json({ message: "Vehicle name is required" }, { status: 400 });
    if (!number) return NextResponse.json({ message: "Vehicle number is required" }, { status: 400 });

    const id =
      typeof body.id === "string" && body.id.trim() ? body.id.trim() : await generateVehicleId();

    const transportMode = normalizeMode(body.transportMode);
    const ownership = normalizeOwnership(body.ownership);
    const fuel = normalizeFuel(body.fuel);

    if (fuel === "OTHER" && !String(body.fuelOther || "").trim()) {
      return NextResponse.json({ message: "fuelOther is required when fuel=OTHER" }, { status: 400 });
    }

    const driverIds: string[] = Array.isArray(body.driverIds) ? body.driverIds : [];

    if (driverIds.length) {
      const drivers = await prisma.driver.findMany({
        where: { id: { in: driverIds } },
        select: { id: true, transportMode: true },
      });

      if (drivers.length !== driverIds.length) {
        return NextResponse.json({ message: "One or more driverIds are invalid" }, { status: 400 });
      }
      const bad = drivers.find((d: { id: string; transportMode: string }) => d.transportMode !== transportMode);
      if (bad) {
        return NextResponse.json(
          { message: "One or more selected drivers do not match the vehicle transport mode" },
          { status: 400 }
        );
      }
    }

    const exists = await prisma.vehicle.findUnique({ where: { number } });
    if (exists) {
      return NextResponse.json(
        {
          message: `Vehicle number "${number}" already exists. Please edit the existing vehicle or use a different number.`,
        },
        { status: 409 }
      );
    }

    const created = await prisma.$transaction(async (tx: any) => {
      const v = await tx.vehicle.create({
        data: {
          id,
          name,
          number,
          ownership,
          engineType: body.engineType || null,
          fuel,
          fuelOther: fuel === "OTHER" ? body.fuelOther || null : null,
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
    if (e?.code === "P2002" && String(e?.meta?.target || "").includes("number")) {
      return NextResponse.json(
        { message: "Vehicle number already exists. Use a different vehicle number." },
        { status: 409 }
      );
    }
    return NextResponse.json({ message: e?.message || "Failed to create vehicle" }, { status: 500 });
  }
}

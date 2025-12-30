// app/api/vehicles/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActorFromRequest } from "@/lib/getActor";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

enum AuditAction {
  UPDATE = "UPDATE",
  DELETE = "DELETE",
}
enum AuditEntityType {
  VEHICLE = "VEHICLE",
}

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

async function getIdFromContext(ctx: any): Promise<string | undefined> {
  const params = await Promise.resolve(ctx?.params);
  const id = params?.id;
  if (typeof id !== "string") return undefined;
  const trimmed = id.trim();
  return trimmed ? trimmed : undefined;
}

function pickVehicleAuditFields(v: any) {
  if (!v) return null;
  return {
    id: v.id,
    name: v.name,
    number: v.number,
    transportMode: v.transportMode,
    ownership: v.ownership,
    fuel: v.fuel,
    updatedAt: v.updatedAt,
  };
}

export async function GET(req: NextRequest, ctx: any) {
  try {
    const actor = await getActorFromRequest(req);
    if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const id = await getIdFromContext(ctx);
    if (!id) return NextResponse.json({ message: "Missing vehicle id" }, { status: 400 });

    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        drivers: { include: { driver: true } },
        shipments: { orderBy: { updatedAt: "desc" } },
        _count: { select: { shipments: true } },
      },
    });

    if (!vehicle) return NextResponse.json({ message: "Not found" }, { status: 404 });

    return NextResponse.json({
      id: vehicle.id,
      name: vehicle.name,
      number: vehicle.number,
      transportMode: vehicle.transportMode,
      ownership: vehicle.ownership,
      engineType: vehicle.engineType,
      fuel: vehicle.fuel,
      fuelOther: vehicle.fuelOther,
      fuelCapacity: vehicle.fuelCapacity,
      loadingCapacity: vehicle.loadingCapacity,
      rcNumber: vehicle.rcNumber,
      rcExpiry: vehicle.rcExpiry,
      pollutionExpiry: vehicle.pollutionExpiry,
      isRegistered: vehicle.isRegistered,
      registeredAt: vehicle.registeredAt,
      docs: vehicle.docs,
      managingVehicle: vehicle.managingVehicle,
      medicalSupport: vehicle.medicalSupport,
      notes: vehicle.notes,

      assignedDrivers: (vehicle.drivers || []).map((vd: { driver: any }) => ({
        id: vd.driver.id,
        name: vd.driver.name,
        role: vd.driver.role,
        contactNumber: vd.driver.contactNumber,
        licenseNumber: vd.driver.licenseNumber,
        transportMode: vd.driver.transportMode,
      })),

      shipmentsCount: vehicle._count?.shipments ?? 0,
      shipments: vehicle.shipments.map((s: any) => ({
        id: s.id,
        reference: s.reference,
        mode: s.mode,
        direction: s.direction,
        status: s.status,
        etd: s.etd,
        eta: s.eta,
        updatedAt: s.updatedAt,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "Failed to fetch vehicle" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: any) {
  try {
    const actor = await getActorFromRequest(req);
    if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const id = await getIdFromContext(ctx);
    if (!id) return NextResponse.json({ message: "Missing vehicle id" }, { status: 400 });

    const body = await req.json().catch(() => ({}));

    const name = normalizeName(body?.name);
    const number = normalizeVehicleNumber(body?.number);

    if (!name) return NextResponse.json({ message: "Vehicle name is required" }, { status: 400 });
    if (!number) return NextResponse.json({ message: "Vehicle number is required" }, { status: 400 });

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
      const bad = drivers.find((d: { transportMode: string }) => d.transportMode !== transportMode);
      if (bad) {
        return NextResponse.json(
          { message: "One or more selected drivers do not match the vehicle transport mode" },
          { status: 400 }
        );
      }
    }

    const before = await prisma.vehicle.findUnique({
      where: { id },
      select: { id: true, name: true, number: true, transportMode: true, ownership: true, fuel: true, updatedAt: true },
    });

    const updated = await prisma.$transaction(async (tx: any) => {
      const v = await tx.vehicle.update({
        where: { id },
        data: {
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

      await tx.vehicleDriver.deleteMany({ where: { vehicleId: id } });
      if (driverIds.length) {
        await tx.vehicleDriver.createMany({
          data: driverIds.map((driverId) => ({ vehicleId: id, driverId })),
          skipDuplicates: true,
        });
      }

      return v;
    });

    await logAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: AuditAction.UPDATE as any,
      entityType: AuditEntityType.VEHICLE as any,
      entityId: id,
      entityRef: number,
      description: `Vehicle updated: ${number}`,
      meta: {
        before: pickVehicleAuditFields(before),
        after: pickVehicleAuditFields(updated),
        driverIds,
      },
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    if (e?.code === "P2002" && String(e?.meta?.target || "").includes("number")) {
      return NextResponse.json({ message: "Vehicle number already exists. Use a different vehicle number." }, { status: 409 });
    }
    if (e?.code === "P2025") {
      return NextResponse.json({ message: "Vehicle not found" }, { status: 404 });
    }
    return NextResponse.json({ message: e?.message || "Failed to update vehicle" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: any) {
  try {
    const actor = await getActorFromRequest(req);
    if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const id = await getIdFromContext(ctx);
    if (!id) return NextResponse.json({ message: "Missing vehicle id" }, { status: 400 });

    const existing = await prisma.vehicle.findUnique({
      where: { id },
      select: { id: true, number: true, name: true },
    });

    await prisma.vehicle.delete({ where: { id } });

    await logAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: AuditAction.DELETE as any,
      entityType: AuditEntityType.VEHICLE as any,
      entityId: id,
      entityRef: existing?.number || id,
      description: `Vehicle deleted: ${existing?.number || id}`,
      meta: { id, number: existing?.number || "", name: existing?.name || "" },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "Failed to delete vehicle" }, { status: 500 });
  }
}

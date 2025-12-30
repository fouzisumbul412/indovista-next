import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getActorFromRequest } from "@/lib/getActor";
import { Vehicle } from "@/types/vehicle";
enum AuditAction {
  UPDATE = "UPDATE",
  DELETE = "DELETE",  
}
enum AuditEntityType {
  DRIVER = "DRIVER",
}

export const dynamic = "force-dynamic";

type TransportMode = "ROAD" | "SEA" | "AIR";
type DriverRole = "DRIVER" | "OPERATOR";

function normalizeMode(v: any): TransportMode {
  const x = String(v || "").toUpperCase();
  if (x === "SEA") return "SEA";
  if (x === "AIR") return "AIR";
  return "ROAD";
}
function normalizeRole(v: any): DriverRole {
  const x = String(v || "").toUpperCase();
  return x === "OPERATOR" ? "OPERATOR" : "DRIVER";
}

// ✅ Works in Next 14 + Next 15 where params may be a Promise
async function getIdFromContext(ctx: any): Promise<string | undefined> {
  const params = await Promise.resolve(ctx?.params);
  const id = params?.id;
  if (typeof id !== "string") return undefined;
  const trimmed = id.trim();
  return trimmed ? trimmed : undefined;
}

export async function GET(_: Request, ctx: any) {
  try {
    const id = await getIdFromContext(ctx);
    if (!id) return NextResponse.json({ message: "Missing driver id" }, { status: 400 });

    const d = await prisma.driver.findUnique({
      where: { id },
      include: { vehicles: { include: { vehicle: true } } },
    });

    if (!d) return NextResponse.json({ message: "Not found" }, { status: 404 });

    return NextResponse.json({
      id: d.id,
      name: d.name,
      age: d.age,
      role: d.role,
      profession: d.profession,
      education: d.education,
      languages: d.languages,
      licenseNumber: d.licenseNumber,
      contactNumber: d.contactNumber,
      email: d.email,
      address: d.address,
      transportMode: d.transportMode,
      medicalCondition: d.medicalCondition,
      notes: d.notes,
      assignedVehicles: (d.vehicles ).map((x: { vehicle: Vehicle }) => ({
        id: x.vehicle.id,
        name: x.vehicle.name,
        number: x.vehicle.number,
        transportMode: x.vehicle.transportMode,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "Failed to fetch driver" }, { status: 500 });
  }
}

export async function PUT(req: Request, ctx: any) {
  try {
    const actor = await getActorFromRequest(req);
    if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const id = await getIdFromContext(ctx);
    if (!id) return NextResponse.json({ message: "Missing driver id" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    if (!String(body?.name || "").trim()) {
      return NextResponse.json({ message: "Driver name is required" }, { status: 400 });
    }

    // ✅ capture BEFORE snapshot for audit
    const before = await prisma.driver.findUnique({
      where: { id },
      include: { vehicles: { select: { vehicleId: true } } },
    });
    if (!before) return NextResponse.json({ message: "Driver not found" }, { status: 404 });

    const transportMode = normalizeMode(body.transportMode);
    const role = normalizeRole(body.role);
    const vehicleIds: string[] = Array.isArray(body.vehicleIds) ? body.vehicleIds : [];

    // ✅ Validate vehicles exist + mode matches
    if (vehicleIds.length) {
      const vehicles = await prisma.vehicle.findMany({
        where: { id: { in: vehicleIds } },
        select: { id: true, transportMode: true },
      });

      if (vehicles.length !== vehicleIds.length) {
        return NextResponse.json({ message: "One or more vehicleIds are invalid" }, { status: 400 });
      }

      const bad = vehicles.find((v: { id: string; transportMode: string }) => v.transportMode !== transportMode);
      if (bad) {
        return NextResponse.json(
          { message: "One or more selected vehicles do not match the driver transport mode" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.$transaction(async (tx: any) => {
      const d = await tx.driver.update({
        where: { id },
        data: {
          name: String(body.name).trim(),
          age: body.age == null || body.age === "" ? null : Number(body.age),
          role,

          profession: body.profession || null,
          education: body.education || null,
          languages: body.languages || null,
          licenseNumber: body.licenseNumber || null,
          contactNumber: body.contactNumber || null,
          email: body.email || null,
          address: body.address || null,

          transportMode,
          medicalCondition: body.medicalCondition || null,
          notes: body.notes || null,
        },
      });

      await tx.vehicleDriver.deleteMany({ where: { driverId: id } });

      if (vehicleIds.length) {
        await tx.vehicleDriver.createMany({
          data: vehicleIds.map((vehicleId) => ({ vehicleId, driverId: id })),
          skipDuplicates: true,
        });
      }

      return d;
    });

    // ✅ Audit log (UPDATE)
    await logAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.DRIVER,
      entityId: id,
      entityRef: id,
      description: `Driver updated: ${updated.name} (${updated.id})`,
      meta: {
        before: {
          ...before,
          vehicleIds: (before.vehicles || []).map((v: { vehicleId: string }) => v.vehicleId),
        },
        after: {
          ...updated,
          vehicleIds,
        },
      },
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    if (e?.code === "P2025") {
      return NextResponse.json({ message: "Driver not found" }, { status: 404 });
    }
    return NextResponse.json({ message: e?.message || "Failed to update driver" }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: any) {
  try {
    const actor = await getActorFromRequest(req);
    if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const id = await getIdFromContext(ctx);
    if (!id) return NextResponse.json({ message: "Missing driver id" }, { status: 400 });

    // ✅ capture BEFORE snapshot (needed for audit)
    const before = await prisma.driver.findUnique({
      where: { id },
      select: { id: true, name: true, transportMode: true, role: true, contactNumber: true, email: true },
    });
    if (!before) return NextResponse.json({ message: "Driver not found" }, { status: 404 });

    await prisma.$transaction(async (tx: any) => {
      await tx.vehicleDriver.deleteMany({ where: { driverId: id } });
      await tx.driver.delete({ where: { id } });
    });

    // ✅ Audit log (DELETE)
    await logAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: AuditAction.DELETE,
      entityType: AuditEntityType.DRIVER,
      entityId: before.id,
      entityRef: before.id,
      description: `Driver deleted: ${before.name} (${before.id})`,
      meta: { deleted: before },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "Failed to delete driver" }, { status: 500 });
  }
}

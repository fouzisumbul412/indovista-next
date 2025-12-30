// app/api/drivers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getActorFromRequest } from "@/lib/getActor";

enum AuditAction {
  CREATE = "CREATE",
}
enum AuditEntityType {
  DRIVER = "DRIVER",
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TransportMode = "ROAD" | "SEA" | "AIR";
type DriverRole = "DRIVER" | "OPERATOR";

function normalizeMode(v: unknown): TransportMode {
  const x = String(v || "").toUpperCase();
  if (x === "SEA") return "SEA";
  if (x === "AIR") return "AIR";
  return "ROAD";
}

function normalizeRole(v: unknown): DriverRole {
  const x = String(v || "").toUpperCase();
  return x === "OPERATOR" ? "OPERATOR" : "DRIVER";
}

async function generateDriverId(): Promise<string> {
  const last = await prisma.driver.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!last) return "DRV-001";
  const m = last.id.match(/DRV-(\d+)/);
  if (!m) return "DRV-001";
  const num = parseInt(m[1], 10) + 1;
  return `DRV-${String(num).padStart(3, "0")}`;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode");

    // ✅ Let Prisma infer correct types (createdAt/updatedAt are Date)
    const rows = await prisma.driver.findMany({
      where: mode ? { transportMode: normalizeMode(mode) } : undefined,
      include: { vehicles: { include: { vehicle: true } } },
      orderBy: { updatedAt: "desc" },
    });

    // ✅ Shape the response (no need to force rows into your Driver type)
    const shaped = rows.map((d: typeof rows[0]) => ({
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

      // If your frontend expects strings, convert Dates here (optional)
      createdAt: d.createdAt?.toISOString?.() ?? null,
      updatedAt: d.updatedAt?.toISOString?.() ?? null,

      assignedVehicles: (d.vehicles ?? []).map((x: typeof d.vehicles[0]) => ({
        id: x.vehicle.id,
        name: x.vehicle.name,
        number: x.vehicle.number,
        transportMode: x.vehicle.transportMode,
        ownership: x.vehicle.ownership,
        fuel: x.vehicle.fuel,
      })),
    }));

    return NextResponse.json(shaped);
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message || "Failed to fetch drivers" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getActorFromRequest(req);
    if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    const name = String(body?.name || "").trim();
    if (!name) return NextResponse.json({ message: "Driver name is required" }, { status: 400 });

    const id =
      typeof body.id === "string" && body.id.trim()
        ? body.id.trim()
        : await generateDriverId();

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

      const bad = vehicles.find((v) => v.transportMode !== transportMode);
      if (bad) {
        return NextResponse.json(
          { message: "One or more selected vehicles do not match the driver transport mode" },
          { status: 400 }
        );
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const d = await tx.driver.create({
        data: {
          id,
          name,
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

      if (vehicleIds.length) {
        await tx.vehicleDriver.createMany({
          data: vehicleIds.map((vehicleId) => ({ vehicleId, driverId: d.id })),
          skipDuplicates: true,
        });
      }

      return d;
    });

    await logAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: AuditAction.CREATE,
      entityType: AuditEntityType.DRIVER,
      entityId: created.id,
      entityRef: created.id,
      description: `Driver created: ${created.name} (${created.id})`,
      meta: { created, vehicleIds },
    });

    // Return created driver (you can also shape like GET if you want)
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message || "Failed to create driver" },
      { status: 500 }
    );
  }
}

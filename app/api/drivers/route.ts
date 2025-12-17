import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode");

    const rows = await prisma.driver.findMany({
      where: mode ? { transportMode: normalizeMode(mode) } : undefined,
      include: {
        vehicles: { include: { vehicle: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const shaped = rows.map((d) => ({
      ...d,
      assignedVehicles: d.vehicles.map((x) => x.vehicle),
    }));

    return NextResponse.json(shaped);
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "Failed to fetch drivers" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    if (!body?.name) return NextResponse.json({ message: "Driver name is required" }, { status: 400 });

    const id = typeof body.id === "string" && body.id.trim() ? body.id.trim() : await generateDriverId();
    const transportMode = normalizeMode(body.transportMode);
    const role = normalizeRole(body.role);

    const vehicleIds: string[] = Array.isArray(body.vehicleIds) ? body.vehicleIds : [];

    const created = await prisma.$transaction(async (tx) => {
      const d = await tx.driver.create({
        data: {
          id,
          name: body.name,
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

    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "Failed to create driver" }, { status: 500 });
  }
}

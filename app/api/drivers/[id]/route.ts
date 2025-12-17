import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
type Ctx = { params: { id: string } | Promise<{ id: string }> };

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

export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await Promise.resolve(ctx.params);

  try {
    const body = await req.json().catch(() => ({}));
    if (!id) return NextResponse.json({ message: "Missing driver id" }, { status: 400 });
    if (!body?.name) return NextResponse.json({ message: "Driver name is required" }, { status: 400 });

    const transportMode = normalizeMode(body.transportMode);
    const role = normalizeRole(body.role);
    const vehicleIds: string[] = Array.isArray(body.vehicleIds) ? body.vehicleIds : [];

    const updated = await prisma.$transaction(async (tx) => {
      const d = await tx.driver.update({
        where: { id },
        data: {
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

      await tx.vehicleDriver.deleteMany({ where: { driverId: id } });
      if (vehicleIds.length) {
        await tx.vehicleDriver.createMany({
          data: vehicleIds.map((vehicleId) => ({ vehicleId, driverId: id })),
          skipDuplicates: true,
        });
      }

      return d;
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "Failed to update driver" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await Promise.resolve(ctx.params);

  try {
    await prisma.driver.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "Failed to delete driver" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function ensureSeed() {
  const count = await prisma.freightMode.count();
  if (count > 0) return;

  await prisma.freightMode.createMany({
    data: [
      { id: "ROAD", label: "Road Freight", enabled: true },
      { id: "SEA", label: "Sea Freight", enabled: true },
      { id: "AIR", label: "Air Freight", enabled: true },
    ],
  });
}

export async function GET() {
  try {
    await ensureSeed();
    const rows = await prisma.freightMode.findMany({
      orderBy: [{ id: "asc" }],
    });
    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "Failed" }, { status: 500 });
  }
}

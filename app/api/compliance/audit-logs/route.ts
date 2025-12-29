import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" };

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const role = (url.searchParams.get("role") || "ALL").trim();
    const take = Math.min(parseInt(url.searchParams.get("take") || "50", 10), 200);

    const where: any = {};

    if (role !== "ALL") where.actorRole = role;

    if (q) {
      where.OR = [
        { description: { contains: q, mode: "insensitive" } },
        { actorName: { contains: q, mode: "insensitive" } },
        { entityRef: { contains: q, mode: "insensitive" } },
        { entityId: { contains: q, mode: "insensitive" } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take,
      select: {
        id: true,
        timestamp: true,
        actorName: true,
        actorRole: true,
        action: true,
        entityType: true,
        entityId: true,
        entityRef: true,
        description: true,
      },
    });

    return NextResponse.json(logs, { headers: noStoreHeaders });
  } catch (e: any) {
    return new NextResponse(e?.message || "Failed to load audit logs", { status: 500 });
  }
}

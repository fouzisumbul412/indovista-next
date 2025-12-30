import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" };

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const status = (url.searchParams.get("status") || "PENDING").trim();

    const tasks = await prisma.complianceTask.findMany({
      where: status === "ALL" ? {} : { status: status as any },
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        type: true,
        priority: true,
        status: true,
        entityType: true,
        entityId: true,
        entityName: true,
        entityRef: true,
        description: true,
        dueDate: true,
        assignedToUser: { select: { name: true } },
      },
    });

    return NextResponse.json(
      tasks.map((t: typeof tasks[number]) => ({
        ...t,
        assignedTo: t.assignedToUser?.name || null,
        dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null,
      })),
      { headers: noStoreHeaders }
    );
  } catch (e: any) {
    return new NextResponse(e?.message || "Failed to load tasks", { status: 500 });
  }
}

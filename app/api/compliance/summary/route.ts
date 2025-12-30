import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" };

export async function GET() {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [totalActions, pendingReviews, activeUsers] = await Promise.all([
      prisma.auditLog.count({ where: { timestamp: { gte: since } } }),
      prisma.complianceTask.count({ where: { status: "PENDING" as any } }),
      prisma.user.count(),
    ]);

    // Simple score: % of tasks not pending
    const totalTasks = await prisma.complianceTask.count();
    const doneTasks = await prisma.complianceTask.count({
      where: { status: { in: ["APPROVED", "REJECTED"] as any } },
    });
    const complianceScore = totalTasks === 0 ? 100 : Math.round((doneTasks / totalTasks) * 100);

    // user roles count
    const roles = await prisma.user.groupBy({
      by: ["role"],
      _count: { role: true },
    });

    return NextResponse.json(
      {
        kpis: {
          totalActions,
          activeUsers,
          complianceScore,
          pendingReviews,
        },
        roles: roles.map((r: typeof roles[number]) => ({ role: r.role, count: r._count.role })),
      },
      { headers: noStoreHeaders }
    );
  } catch (e: any) {
    return new NextResponse(e?.message || "Failed to load compliance summary", { status: 500 });
  }
}

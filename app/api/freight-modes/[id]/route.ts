import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } | Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await Promise.resolve(ctx.params);

  try {
    const body = await req.json().catch(() => ({}));
    const enabled = !!body.enabled;
    const label = typeof body.label === "string" ? body.label : undefined;

    const updated = await prisma.freightMode.update({
      where: { id: id as any },
      data: {
        enabled,
        ...(label ? { label } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "Failed" }, { status: 500 });
  }
}

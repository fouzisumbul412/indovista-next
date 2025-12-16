// app/api/master-data/[type]/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const modelMap: Record<string, any> = {
  ports: prisma.port,
  incoterms: prisma.incoterm,
  "status-codes": prisma.statusCode,
  currencies: prisma.currency,
  "temp-presets": prisma.temperature,
  containers: prisma.containerType, 
};

type RouteContext = {
  params: Promise<{ type: string; id: string }>;
};

// DELETE /api/master-data/:type/:id
export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { type, id } = await context.params;
    const model = modelMap[type];

    if (!model) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    await model.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/master-data/[type]/[id]] Error:", error);
    return NextResponse.json(
      { error: "Server error while deleting record" },
      { status: 500 }
    );
  }
}

// PUT /api/master-data/:type/:id
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { type, id } = await context.params;
    const model = modelMap[type];

    if (!model) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const body = await req.json();

    const updated = await model.update({
      where: { id: Number(id) },
      data: body,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PUT /api/master-data/[type]/[id]] Error:", error);
    return NextResponse.json(
      { error: "Server error while updating record" },
      { status: 500 }
    );
  }
}

// app/api/master-data/[type]/route.ts
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
  params: Promise<{ type: string }>;
};

// GET /api/master-data/:type
export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { type } = await context.params;
    const model = modelMap[type];

    if (!model) {
      return NextResponse.json([]);
    }

    const data = await model.findMany({
      orderBy: { id: "asc" },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("[GET /api/master-data/[type]] Error:", error);
    return NextResponse.json(
      { error: "Server error while fetching master data" },
      { status: 500 }
    );
  }
}

// POST /api/master-data/:type
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { type } = await context.params;
    const model = modelMap[type];

    if (!model) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const body = await req.json();

    // Bulk create (array)
    if (Array.isArray(body)) {
      const created: any[] = [];
      for (const item of body) {
        const row = await model.create({ data: item });
        created.push(row);
      }
      return NextResponse.json(created, { status: 201 });
    }

    // Single create
    const created = await model.create({
      data: body,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("[POST /api/master-data/[type]] Error:", error);
    return NextResponse.json(
      { error: "Server error while creating record" },
      { status: 500 }
    );
  }
}

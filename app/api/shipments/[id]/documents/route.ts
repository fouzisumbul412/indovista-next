import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" };

// works for Next 14 (params object) and Next 15 (params Promise)
async function getParams(ctx: any) {
  return await Promise.resolve(ctx.params);
}

export async function GET(_req: Request, ctx: any) {
  try {
    const { id: shipmentId } = await getParams(ctx);

    const docs = await prisma.shipmentDocument.findMany({
      where: { shipmentId },
      orderBy: { uploadedAt: "desc" },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        uploadedAt: true,
        expiryDate: true,
        fileUrl: true,
        mimeType: true,
        fileSize: true,
        shipmentId: true,
      },
    });

    return NextResponse.json(
      docs.map((d) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        status: d.status,
        uploadedAt: d.uploadedAt ? d.uploadedAt.toISOString().slice(0, 10) : "",
        expiryDate: d.expiryDate ? d.expiryDate.toISOString().slice(0, 10) : "",
        fileUrl: d.fileUrl || "",
        mimeType: d.mimeType || "",
        fileSize: d.fileSize ?? null,
        shipmentId: d.shipmentId,
      })),
      { headers: noStoreHeaders }
    );
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message || "Failed to load shipment documents" },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

export async function POST(req: Request, ctx: any) {
  try {
    const { id: shipmentId } = await getParams(ctx);

    // validate shipment exists
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: { id: true },
    });
    if (!shipment) {
      return NextResponse.json(
        { message: "Shipment not found" },
        { status: 404, headers: noStoreHeaders }
      );
    }

    const form = await req.formData();

    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { message: "Missing file" },
        { status: 400, headers: noStoreHeaders }
      );
    }

    const name = String(form.get("name") || file.name || "Document");
    const type = String(form.get("type") || "OTHER");
    const status = String(form.get("status") || "DRAFT");
    const expiryDateRaw = form.get("expiryDate");
    const expiryDate =
      expiryDateRaw && String(expiryDateRaw).trim()
        ? new Date(String(expiryDateRaw))
        : null;

    const bytes = Buffer.from(await file.arrayBuffer());
    const mime = file.type || null;

    // store file
    const uploadsDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "shipments",
      shipmentId
    );
    await fs.mkdir(uploadsDir, { recursive: true });

    const original = file.name || "document";
    const ext = path.extname(original).slice(0, 10);
    const base = path
      .basename(original, path.extname(original))
      .replace(/[^a-zA-Z0-9-_]+/g, "_")
      .slice(0, 80);

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${stamp}_${base}${ext || ""}`;

    await fs.writeFile(path.join(uploadsDir, filename), bytes);

    const url = `/uploads/shipments/${shipmentId}/${filename}`;

    const created = await prisma.shipmentDocument.create({
      data: {
        shipmentId,
        name,
        type: type as any,
        status: status as any,
        expiryDate,
        fileUrl: url,
        mimeType: mime,
        fileSize: bytes.length,
      },
      select: { id: true },
    });

    return NextResponse.json(created, { headers: noStoreHeaders });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message || "Upload failed" },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

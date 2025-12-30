// app/api/shipments/[id]/documents/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadShipmentDocument } from "@/lib/uploadShipmentDocument";
import { Document } from "@/types";

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
      docs.map((d: Document) => ({
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

    // ✅ Upload to Vercel Blob (NO filesystem)
    const uploaded = await uploadShipmentDocument(shipmentId, file);

    // ✅ Save DB record
    const created = await prisma.shipmentDocument.create({
      data: {
        shipmentId,
        name,
        type: type as any,
        status: status as any,
        expiryDate,
        fileUrl: uploaded.fileUrl,
        mimeType: uploaded.mimeType,
        fileSize: uploaded.fileSize,
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

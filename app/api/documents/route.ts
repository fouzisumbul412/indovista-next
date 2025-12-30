import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Document } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" };

export async function GET() {
  try {
    const docs = await prisma.shipmentDocument.findMany({
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
        shipment: {
          select: {
            id: true,
            reference: true,
            customer: { select: { companyName: true } },
          },
        },
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
        shipmentRef: d.shipment?.reference || "",
        customerName: d.shipment?.customer?.companyName || "",
      })),
      { headers: noStoreHeaders }
    );
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message || "Failed to load documents" },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

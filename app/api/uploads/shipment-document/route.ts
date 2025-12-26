export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { uploadShipmentDocument } from "@/lib/uploadShipmentDocument";

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const shipmentId = String(form.get("shipmentId") || "");
    const file = form.get("file") as File | null;

    if (!shipmentId) {
      return new NextResponse("shipmentId missing", { status: 400 });
    }

    if (!file) {
      return new NextResponse("file missing", { status: 400 });
    }

    const result = await uploadShipmentDocument(shipmentId, file);

    return NextResponse.json(result);
  } catch (err: any) {
    return new NextResponse(err.message || "Upload failed", { status: 500 });
  }
}

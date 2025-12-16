export const runtime = "nodejs";

import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(req: Request) {
  const form = await req.formData();

  const shipmentId = String(form.get("shipmentId") || "");
  const file = form.get("file") as File | null;

  if (!shipmentId) return new NextResponse("shipmentId missing", { status: 400 });
  if (!file) return new NextResponse("file missing", { status: 400 });

  const mime = file.type || "";
  const allowed = ["application/pdf", "image/png", "image/jpeg"];
  if (!allowed.includes(mime)) return new NextResponse("Only pdf/png/jpg allowed", { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());

  const dir = path.join(process.cwd(), "public", "uploads", "shipments", safeName(shipmentId));
  await fs.mkdir(dir, { recursive: true });

  const ext = mime === "application/pdf" ? "pdf" : mime === "image/png" ? "png" : "jpg";
  const fileName = `${Date.now()}_${safeName(file.name || `document.${ext}`)}`;
  const abs = path.join(dir, fileName);

  await fs.writeFile(abs, bytes);

  const fileUrl = `/uploads/shipments/${shipmentId}/${fileName}`;

  return NextResponse.json({
    fileUrl,
    mimeType: mime,
    fileSize: bytes.length,
    originalName: file.name,
  });
}

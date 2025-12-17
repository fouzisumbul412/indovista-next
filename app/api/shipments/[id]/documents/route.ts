export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import path from "path";
import fs from "fs/promises";

type Ctx = { params: { id: string } | Promise<{ id: string }> };

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(req: Request, { params }: Ctx) {
  const { id: shipmentId } = await params;

  const form = await req.formData();

  const file = form.get("file") as File | null;
  const name = String(form.get("name") || "");
  const type = String(form.get("type") || "OTHER");
  const status = String(form.get("status") || "DRAFT");
  const expiryDate = String(form.get("expiryDate") || "");

  if (!file) return new NextResponse("File missing", { status: 400 });

  const mime = file.type || "";
  const allowed = ["application/pdf", "image/png", "image/jpeg"];
  if (!allowed.includes(mime)) {
    return new NextResponse("Only pdf/png/jpg allowed", { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), "public", "uploads", "shipments", shipmentId);
  await fs.mkdir(dir, { recursive: true });

  const ext = mime === "application/pdf" ? "pdf" : mime === "image/png" ? "png" : "jpg";
  const fileName = `${Date.now()}_${safeName(file.name || `document.${ext}`)}`;
  const abs = path.join(dir, fileName);
  await fs.writeFile(abs, bytes);

  const url = `/uploads/shipments/${shipmentId}/${fileName}`;

  const created = await prisma.shipmentDocument.create({
    data: {
      shipmentId,
      name: name || file.name || "Document",
      type: type as any,
      status: status as any,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      fileUrl: url,
      mimeType: mime,
      fileSize: bytes.length,
    },
  });

  return NextResponse.json({ id: created.id, fileUrl: created.fileUrl });
}

export async function GET(_req: Request, { params }: Ctx) {
  const { id: shipmentId } = await params;

  const docs = await prisma.shipmentDocument.findMany({
    where: { shipmentId },
    orderBy: { uploadedAt: "desc" },
  });

  return NextResponse.json(docs);
}

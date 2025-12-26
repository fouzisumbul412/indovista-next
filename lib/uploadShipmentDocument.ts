import path from "path";
import fs from "fs/promises";

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function uploadShipmentDocument(
  shipmentId: string,
  file: File
): Promise<{
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  originalName: string;
}> {
  const mime = file.type || "";
  const allowed = ["application/pdf", "image/png", "image/jpeg"];

  if (!allowed.includes(mime)) {
    throw new Error("Only pdf/png/jpg allowed");
  }

  const ext =
    mime === "application/pdf"
      ? "pdf"
      : mime === "image/png"
      ? "png"
      : "jpg";

  const cleanShipmentId = safeName(shipmentId);
  const cleanName = safeName(file.name || `document.${ext}`);
  const fileName = `${Date.now()}_${cleanName}`;

  /* =========================
     ✅ VERCEL (Blob storage)
     ========================= */
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");

    const blob = await put(
      `shipments/${cleanShipmentId}/${fileName}`,
      file,
      { access: "public" }
    );

    return {
      fileUrl: blob.url,
      mimeType: mime,
      fileSize: file.size,
      originalName: file.name,
    };
  }

  /* =========================
     ✅ VPS / LOCAL filesystem
     ========================= */
  const uploadDir = path.join(
    process.cwd(),
    "public",
    "uploads",
    "shipments",
    cleanShipmentId
  );

  await fs.mkdir(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const absPath = path.join(uploadDir, fileName);

  await fs.writeFile(absPath, buffer);

  return {
    fileUrl: `/uploads/shipments/${cleanShipmentId}/${fileName}`,
    mimeType: mime,
    fileSize: buffer.length,
    originalName: file.name,
  };
}

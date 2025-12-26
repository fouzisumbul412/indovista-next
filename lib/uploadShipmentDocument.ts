import path from "path";
import fs from "fs/promises";

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

const ALLOWED = ["application/pdf", "image/png", "image/jpeg"];

function isVercel() {
  return process.env.VERCEL === "1" || !!process.env.VERCEL_ENV;
}

export async function uploadShipmentDocument(shipmentId: string, file: File) {
  const mime = file.type || "";
  if (!ALLOWED.includes(mime)) throw new Error("Only pdf/png/jpg allowed");

  const ext =
    mime === "application/pdf" ? "pdf" : mime === "image/png" ? "png" : "jpg";

  const cleanShipmentId = safeName(shipmentId);
  const cleanName = safeName(file.name || `document.${ext}`);
  const fileName = `${Date.now()}_${cleanName}`;

  // ✅ On Vercel: NEVER use filesystem
  if (isVercel()) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error(
        "Vercel requires Blob upload. Missing BLOB_READ_WRITE_TOKEN in Vercel env vars (Production/Preview). Save + redeploy."
      );
    }

    const { put } = await import("@vercel/blob");
    const blob = await put(`shipments/${cleanShipmentId}/${fileName}`, file, {
      access: "public",
      contentType: mime,
    });

    return {
      fileUrl: blob.url,
      mimeType: mime,
      fileSize: file.size,
      originalName: file.name,
      storage: "blob" as const,
    };
  }

  // ✅ VPS / Local filesystem
//   const uploadDir = path.join(
//     process.cwd(),
//     "public",
//     "uploads",
//     "shipments",
//     cleanShipmentId
//   );

//   await fs.mkdir(uploadDir, { recursive: true });

//   const buffer = Buffer.from(await file.arrayBuffer());
//   const absPath = path.join(uploadDir, fileName);

//   await fs.writeFile(absPath, buffer);

//   return {
//     fileUrl: `/uploads/shipments/${cleanShipmentId}/${fileName}`,
//     mimeType: mime,
//     fileSize: buffer.length,
//     originalName: file.name,
//     storage: "fs" as const,
//   };
}

// lib/uploadShipmentDocument.ts
const ALLOWED = ["application/pdf", "image/png", "image/jpeg"];

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function uploadShipmentDocument(shipmentId: string, file: File) {
  const mime = file.type || "";
  if (!ALLOWED.includes(mime)) throw new Error("Only pdf/png/jpg allowed");

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is missing at runtime on Vercel. Add it in Vercel Project → Settings → Environment Variables (Production/Preview) and redeploy."
    );
  }

  const cleanShipmentId = safeName(shipmentId);
  const cleanName = safeName(file.name || "document");
  const fileName = `${Date.now()}_${cleanName}`;

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

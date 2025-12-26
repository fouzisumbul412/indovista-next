// lib/deleteShipmentDocument.ts
import fs from "fs/promises";
import path from "path";

function isVercel() {
  return process.env.VERCEL === "1" || !!process.env.VERCEL_ENV;
}

export async function deleteShipmentDocument(shipmentId: string, fileUrl: string) {
  // Blob URL
  if (fileUrl.startsWith("http")) {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { del } = await import("@vercel/blob");
      await del(fileUrl);
    }
    return;
  }

  // Never do filesystem deletes on Vercel
  if (isVercel()) return;

  // (VPS/local path — not used on Vercel)
  if (!fileUrl.startsWith("/uploads/")) return;

  const abs = path.join(process.cwd(), "public", fileUrl);
  const safeRoot = path.join(process.cwd(), "public", "uploads", "shipments", shipmentId);

  if (!abs.startsWith(safeRoot)) return;

  try {
    await fs.unlink(abs);
  } catch {}
}

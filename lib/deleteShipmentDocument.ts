import fs from "fs/promises";
import path from "path";

function isVercelRuntime() {
  return process.env.VERCEL === "1" || !!process.env.VERCEL_ENV;
}

export async function deleteShipmentDocument(shipmentId: string, fileUrl: string) {
  // ✅ If it's a Blob URL, delete via Blob (when token exists)
  if (fileUrl.startsWith("http")) {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { del } = await import("@vercel/blob");
      await del(fileUrl);
    }
    // If token missing, just skip physical delete (DB row already removed)
    return;
  }

  // ✅ On Vercel, never touch filesystem
  if (isVercelRuntime()) return;

  // ✅ VPS/local filesystem
  if (!fileUrl.startsWith("/uploads/")) return;

  const abs = path.join(process.cwd(), "public", fileUrl);
  const safeRoot = path.join(
    process.cwd(),
    "public",
    "uploads",
    "shipments",
    shipmentId
  );

  if (!abs.startsWith(safeRoot)) return;

  try {
    await fs.unlink(abs);
  } catch {
    // ignore missing file
  }
}

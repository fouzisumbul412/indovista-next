import path from "path";
import fs from "fs/promises";

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

const ALLOWED = ["application/pdf", "image/png", "image/jpeg"];

function isVercelRuntime() {
  return process.env.VERCEL === "1" || !!process.env.VERCEL_ENV;
}

type StorageMode = "blob" | "fs";

function getStorageMode(): StorageMode {
  // Optional override:
  // - On VPS: set UPLOAD_STORAGE=fs
  // - On Vercel: set UPLOAD_STORAGE=blob (or leave unset)
  const forced = (process.env.UPLOAD_STORAGE || "").toLowerCase();
  if (forced === "blob" || forced === "fs") return forced;

  // Default: Vercel => blob, others => fs
  return isVercelRuntime() ? "blob" : "fs";
}

export async function uploadShipmentDocument(shipmentId: string, file: File) {
  const mime = file.type || "";
  if (!ALLOWED.includes(mime)) throw new Error("Only pdf/png/jpg allowed");

  const ext =
    mime === "application/pdf" ? "pdf" : mime === "image/png" ? "png" : "jpg";

  const cleanShipmentId = safeName(shipmentId);
  const cleanName = safeName(file.name || `document.${ext}`);
  const fileName = `${Date.now()}_${cleanName}`;

  const mode = getStorageMode();

  // ✅ Vercel / Cloud storage
  if (mode === "blob") {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      // Critical: do NOT fall back to filesystem on Vercel
      throw new Error(
        "Blob upload is enabled but BLOB_READ_WRITE_TOKEN is missing. Add it in Vercel env vars (Production/Preview) and redeploy."
      );
    }

    const { put } = await import("@vercel/blob");
    const blob = await put(`shipments/${cleanShipmentId}/${fileName}`, file, {
      access: "public",
      contentType: mime, // helps correct serving
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
  if (isVercelRuntime()) {
    // Safety net: filesystem storage is not supported on Vercel
    throw new Error("Filesystem uploads are not supported on Vercel. Use Blob.");
  }

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
    storage: "fs" as const,
  };
}

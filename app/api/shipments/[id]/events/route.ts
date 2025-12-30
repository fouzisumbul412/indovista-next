// app/api/shipments/[id]/events/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadShipmentDocument } from "@/lib/uploadShipmentDocument";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" };

// ✅ Next.js 16 expects params to be a Promise
type Ctx = { params: Promise<{ id: string }> };

// ✅ robust: get id from params OR parse from URL (/api/shipments/:id/events)
async function getRawId(req: NextRequest, ctx: Ctx): Promise<string | null> {
  // 1) from route params
  try {
    const { id } = await ctx.params;
    if (id && String(id).trim()) return String(id).trim();
  } catch {
    // ignore
  }

  // 2) fallback: parse from URL path
  try {
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    // ["api","shipments",":id","events"]
    const idx = parts.indexOf("shipments");
    const id = idx >= 0 ? parts[idx + 1] : null;
    return id ? decodeURIComponent(id) : null;
  } catch {
    return null;
  }
}

async function resolveShipmentId(rawId: string) {
  const shipment = await prisma.shipment.findFirst({
    where: { OR: [{ id: rawId }, { reference: rawId }] },
    select: { id: true },
  });
  return shipment?.id || null;
}

function isAllowedProofMime(mime: string) {
  if (!mime) return false;
  if (mime.startsWith("image/")) return true;
  if (mime.startsWith("video/")) return true;
  if (mime === "application/pdf") return true;
  return false;
}

// ✅ Keep the allowed statuses here (matches your UI + types.ts)
const ALLOWED_SHIPMENT_STATUSES = [
  "BOOKED",
  "PICKED_UP",
  "IN_TRANSIT_ORIGIN",
  "AT_PORT_ORIGIN",
  "CUSTOMS_EXPORT",
  "ON_VESSEL",
  "AT_PORT_DEST",
  "CUSTOMS_IMPORT",
  "DELIVERED",
  "EXCEPTION",
] as const;

type AllowedShipmentStatus = (typeof ALLOWED_SHIPMENT_STATUSES)[number];
const SHIPMENT_STATUS_SET = new Set<string>(ALLOWED_SHIPMENT_STATUSES);

function parseShipmentStatus(input: unknown): AllowedShipmentStatus | null {
  if (typeof input !== "string") return null;
  const normalized = input.trim().toUpperCase().replace(/[ -]+/g, "_");
  if (SHIPMENT_STATUS_SET.has(normalized)) return normalized as AllowedShipmentStatus;
  return null;
}

function formString(form: FormData, key: string): string | null {
  const v = form.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

/**
 * ✅ GET /api/shipments/:id/events
 */
export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const rawId = await getRawId(req, ctx);
    if (!rawId) return new NextResponse("Missing shipment id", { status: 400 });

    const shipmentId = await resolveShipmentId(rawId);
    if (!shipmentId) return new NextResponse("Shipment not found", { status: 404 });

    const events = await prisma.shipmentEvent.findMany({
      where: { shipmentId },
      orderBy: [{ timestamp: "desc" }],
      select: {
        id: true,
        shipmentId: true,
        status: true,
        timestamp: true,
        location: true,
        description: true,
        user: true,
        proofUrl: true,
        proofName: true,
        proofMimeType: true,
        proofFileSize: true,
      },
    });

    return NextResponse.json(events, { headers: noStoreHeaders });
  } catch (e: any) {
    return new NextResponse(e?.message || "Failed to fetch events", { status: 500 });
  }
}

/**
 * ✅ POST /api/shipments/:id/events
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const rawId = await getRawId(req, ctx);
    if (!rawId) return new NextResponse("Missing shipment id", { status: 400 });

    const shipmentId = await resolveShipmentId(rawId);
    if (!shipmentId) return new NextResponse("Shipment not found", { status: 404 });

    const ct = req.headers.get("content-type") || "";

    let statusRaw: unknown = "";
    let timestampRaw: string | null = null;
    let location: string | null = null;
    let description: string | null = null;
    let user: string | null = null;

    let proofFile: File | null = null;

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();

      statusRaw = formString(form, "status") ?? "";
      timestampRaw = formString(form, "timestamp");
      location = formString(form, "location");
      description = formString(form, "description");
      user = formString(form, "user") ?? "System";

      const pf = form.get("proof");
      proofFile = pf instanceof File ? pf : null;
    } else {
      const body = await req.json().catch(() => ({}));

      statusRaw = body?.status ?? "";
      timestampRaw = body?.timestamp ?? null;
      location = body?.location ?? null;
      description = body?.description ?? null;
      user = body?.user ?? "System";
      proofFile = null;
    }

    const status = parseShipmentStatus(statusRaw);
    if (!status) {
      return new NextResponse(`Invalid status. Allowed: ${ALLOWED_SHIPMENT_STATUSES.join(", ")}`, {
        status: 400,
      });
    }

    const needsProof = status === "DELIVERED";
    if (needsProof && !proofFile) {
      return new NextResponse("Proof file is required when status is DELIVERED", { status: 400 });
    }

    const ts = timestampRaw ? new Date(timestampRaw) : new Date();
    const timestamp = isNaN(ts.getTime()) ? new Date() : ts;

    let proofUrl: string | null = null;
    let proofName: string | null = null;
    let proofMimeType: string | null = null;
    let proofFileSize: number | null = null;

    if (proofFile) {
      const mime = proofFile.type || "";
      if (!isAllowedProofMime(mime)) {
        return new NextResponse("Invalid proof type. Allowed: image/*, video/*, application/pdf", {
          status: 400,
        });
      }

      const uploaded = await uploadShipmentDocument(shipmentId, proofFile);

      proofUrl = uploaded.fileUrl;
      proofName = proofFile.name || "Proof";
      proofMimeType = uploaded.mimeType || mime || null;
      proofFileSize = uploaded.fileSize ?? null;
    }

    const result = await prisma.$transaction(async (tx: { shipment: { update: (arg0: { where: { id: any; }; data: { status: any; }; select: { id: boolean; }; }) => any; }; shipmentDocument: { create: (arg0: { data: { shipmentId: any; name: string; type: any; status: any; expiryDate: null; fileUrl: string; mimeType: string; fileSize: number | null; }; select: { id: boolean; }; }) => any; }; shipmentEvent: { create: (arg0: { data: { shipmentId: any; status: any; timestamp: Date; location: string | null; description: string | null; user: string | null; proofUrl: string | null; proofName: string | null; proofMimeType: string | null; proofFileSize: number | null; }; select: { id: boolean; shipmentId: boolean; status: boolean; timestamp: boolean; location: boolean; description: boolean; user: boolean; proofUrl: boolean; proofName: boolean; proofMimeType: boolean; proofFileSize: boolean; }; }) => any; }; }) => {
      const s = await tx.shipment.update({
        where: { id: shipmentId },
        data: { status: status as any },
        select: { id: true },
      });

      if (proofUrl) {
        await tx.shipmentDocument.create({
          data: {
            shipmentId,
            name: `Proof of Delivery - ${proofName || "Proof"}`,
            type: "OTHER" as any,
            status: "FINAL" as any,
            expiryDate: null,
            fileUrl: proofUrl,
            mimeType: proofMimeType || "",
            fileSize: proofFileSize ?? null,
          },
          select: { id: true },
        });
      }

      const createdEvent = await tx.shipmentEvent.create({
        data: {
          shipmentId,
          status: status as any,
          timestamp,
          location,
          description,
          user,
          proofUrl,
          proofName,
          proofMimeType,
          proofFileSize,
        },
        select: {
          id: true,
          shipmentId: true,
          status: true,
          timestamp: true,
          location: true,
          description: true,
          user: true,
          proofUrl: true,
          proofName: true,
          proofMimeType: true,
          proofFileSize: true,
        },
      });

      return { shipmentId: s.id, event: createdEvent };
    });

    return NextResponse.json(
      { ok: true, shipmentId: result.shipmentId, event: result.event },
      { headers: noStoreHeaders }
    );
  } catch (e: any) {
    return new NextResponse(e?.message || "Status update failed", { status: 500 });
  }
}

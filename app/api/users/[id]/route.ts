import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getActorFromRequest } from "@/lib/getActor";
import { AuditAction, AuditEntityType } from "@/lib/generated/prisma/browser";

export const dynamic = "force-dynamic";

type Role = "SUPER_ADMIN" | "ADMIN" | "OPERATOR" | "FINANCE" | "DOCUMENTOR";

function normalizeRole(v: any): Role {
  const x = String(v || "").toUpperCase();
  if (x === "SUPER_ADMIN") return "SUPER_ADMIN";
  if (x === "ADMIN") return "ADMIN";
  if (x === "FINANCE") return "FINANCE";
  if (x === "DOCUMENTOR") return "DOCUMENTOR";
  return "OPERATOR";
}

async function getIdFromContext(ctx: any): Promise<number | null> {
  const params = await Promise.resolve(ctx?.params);
  const raw = params?.id;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function GET(_: Request, ctx: any) {
  try {
    const id = await getIdFromContext(ctx);
    if (!id) return NextResponse.json({ message: "Invalid user id" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, loginId: true, name: true, email: true, role: true, createdAt: true },
    });

    if (!user) return NextResponse.json({ message: "Not found" }, { status: 404 });

    return NextResponse.json({ ...user, createdAt: user.createdAt.toISOString() });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "Failed to fetch user" }, { status: 500 });
  }
}

export async function PUT(req: Request, ctx: any) {
  try {
    // ✅ Real actor from cookie/JWT
    const actor = await getActorFromRequest(req);
    if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const id = await getIdFromContext(ctx);
    if (!id) return NextResponse.json({ message: "Invalid user id" }, { status: 400 });

    const before = await prisma.user.findUnique({
      where: { id },
      select: { id: true, loginId: true, name: true, email: true, role: true },
    });
    if (!before) return NextResponse.json({ message: "User not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));

    const loginId = String(body?.loginId || "").trim();
    const name = String(body?.name || "").trim();

    if (!loginId) return NextResponse.json({ message: "loginId is required" }, { status: 400 });
    if (!name) return NextResponse.json({ message: "name is required" }, { status: 400 });

    const role = normalizeRole(body.role);
    const email = body.email ? String(body.email).trim() : null;

    const data: any = { loginId, name, email, role };

    const passwordChanged = Boolean(body.password && String(body.password).length > 0);
    if (passwordChanged) {
      data.password = await bcrypt.hash(String(body.password), 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, loginId: true, name: true, email: true, role: true, createdAt: true },
    });

    // ✅ AUDIT LOG
    await logAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.USER,
      entityId: String(updated.id),
      entityRef: updated.loginId,
      description: `User updated: ${updated.name} (${updated.loginId}) role=${updated.role}`,
      meta: {
        before,
        after: { ...updated, createdAt: updated.createdAt.toISOString() },
        passwordChanged,
      },
    });

    return NextResponse.json({ ...updated, createdAt: updated.createdAt.toISOString() });
  } catch (e: any) {
    if (e?.code === "P2025") return NextResponse.json({ message: "User not found" }, { status: 404 });
    if (e?.code === "P2002") return NextResponse.json({ message: "loginId already exists" }, { status: 409 });
    return NextResponse.json({ message: e?.message || "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: any) {
  try {
    // ✅ Real actor from cookie/JWT
    const actor = await getActorFromRequest(req);
    if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const id = await getIdFromContext(ctx);
    if (!id) return NextResponse.json({ message: "Invalid user id" }, { status: 400 });

    const before = await prisma.user.findUnique({
      where: { id },
      select: { id: true, loginId: true, name: true, email: true, role: true },
    });
    if (!before) return NextResponse.json({ message: "User not found" }, { status: 404 });

    await prisma.user.delete({ where: { id } });

    // ✅ AUDIT LOG
    await logAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: AuditAction.DELETE,
      entityType: AuditEntityType.USER,
      entityId: String(before.id),
      entityRef: before.loginId,
      description: `User deleted: ${before.name} (${before.loginId}) role=${before.role}`,
      meta: { deleted: before },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e?.code === "P2025") return NextResponse.json({ message: "User not found" }, { status: 404 });
    return NextResponse.json({ message: e?.message || "Failed to delete user" }, { status: 500 });
  }
}

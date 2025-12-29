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

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, loginId: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })));
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // ✅ Real actor from cookie/JWT
    const actor = await getActorFromRequest(req);
    if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    const loginId = String(body?.loginId || "").trim();
    const name = String(body?.name || "").trim();
    const password = String(body?.password || "");

    if (!loginId) return NextResponse.json({ message: "loginId is required" }, { status: 400 });
    if (!name) return NextResponse.json({ message: "name is required" }, { status: 400 });
    if (!password) return NextResponse.json({ message: "password is required" }, { status: 400 });

    const role = normalizeRole(body.role);
    const email = body.email ? String(body.email).trim() : null;

    const hashed = await bcrypt.hash(password, 10);

    const created = await prisma.user.create({
      data: { loginId, name, email, role, password: hashed },
      select: { id: true, loginId: true, name: true, email: true, role: true, createdAt: true },
    });

    // ✅ AUDIT LOG (no "req" passed)
    await logAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: AuditAction.CREATE,
      entityType: AuditEntityType.USER,
      entityId: String(created.id),
      entityRef: created.loginId,
      description: `User created: ${created.name} (${created.loginId}) role=${created.role}`,
      meta: { created: { ...created, createdAt: created.createdAt.toISOString() } },
    });

    return NextResponse.json({ ...created, createdAt: created.createdAt.toISOString() }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ message: "loginId already exists" }, { status: 409 });
    }
    return NextResponse.json({ message: e?.message || "Failed to create user" }, { status: 500 });
  }
}

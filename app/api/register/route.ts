// app/api/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getActorFromRequest } from "@/lib/getActor";
import { logAudit } from "@/lib/audit";

enum AuditAction {
  CREATE = "CREATE",
}
enum AuditEntityType {
  USER = "USER",
}

type Role = "SUPER_ADMIN" | "ADMIN" | "OPERATOR" | "FINANCE" | "DOCUMENTOR";

function normalizeRole(v: any): Role {
  const x = String(v || "").toUpperCase();
  if (x === "SUPER_ADMIN") return "SUPER_ADMIN";
  if (x === "ADMIN") return "ADMIN";
  if (x === "FINANCE") return "FINANCE";
  if (x === "DOCUMENTOR") return "DOCUMENTOR";
  return "OPERATOR";
}

const clean = (v: any) => String(v ?? "").trim();

export async function POST(req: NextRequest) {
  try {
    const actor = await getActorFromRequest(req);
    if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const loginId = clean(body?.loginId);
    const password = String(body?.password || "");
    const name = clean(body?.name);
    const email = body?.email ? clean(body.email) : null;
    const role = normalizeRole(body?.role);

    if (!loginId || !password || !name) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { loginId } });
    if (existing) {
      return NextResponse.json({ message: "User already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { loginId, password: hashedPassword, role, name, email },
      select: { id: true, loginId: true, role: true, name: true, email: true, createdAt: true },
    });

    await logAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: AuditAction.CREATE as any,
      entityType: AuditEntityType.USER as any,
      //entityId: user.id,
      entityRef: user.loginId,
      description: `User registered: ${user.loginId} (${user.role})`,
      meta: {
        createdUser: { id: user.id, loginId: user.loginId, role: user.role, name: user.name, email: user.email },
      },
    });

    return NextResponse.json({ message: "User registered successfully", user }, { status: 201 });
  } catch (error: any) {
    console.error("REGISTER ERROR:", error);
    return NextResponse.json({ message: error?.message || "Server Error" }, { status: 500 });
  }
}

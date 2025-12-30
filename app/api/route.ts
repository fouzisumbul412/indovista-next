// app/api/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

enum AuditAction {
  LOGIN_SUCCESS = "LOGIN_SUCCESS",
  LOGIN_FAILED = "LOGIN_FAILED",
}
enum AuditEntityType {
  AUTH = "AUTH",
}

export async function POST(req: NextRequest) {
  const { loginId, email, password } = await req.json();

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { loginId: loginId || undefined },
        { email: email?.toLowerCase() || undefined },
      ],
    },
  });

  if (!user || !user.password) {
    await logAudit({
      actorUserId: null,
      actorName: null,
      actorRole: null,
      action: AuditAction.LOGIN_FAILED as any,
      entityType: AuditEntityType.AUTH as any,
      entityId: "LOGIN",
      entityRef: String(loginId || email || ""),
      description: "Login failed: user not found",
      meta: { loginId: loginId || null, email: email || null, reason: "USER_NOT_FOUND" },
    });
    return NextResponse.json({ error: "User not found" }, { status: 400 });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    await logAudit({
      actorUserId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: AuditAction.LOGIN_FAILED as any,
      entityType: AuditEntityType.AUTH as any,
      entityId: "LOGIN",
      //entityRef: user.id,
      description: "Login failed: invalid credentials",
      meta: { userId: user.id, loginId: user.loginId, email: user.email, reason: "INVALID_PASSWORD" },
    });
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = jwt.sign(
    { id: user.id, role: user.role, email: user.email, name: user.name },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );

  const res = NextResponse.json({
    success: true,
    user: { id: user.id, name: user.name, role: user.role, email: user.email },
  });

  res.cookies.set("token", token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  await logAudit({
    actorUserId: user.id,
    actorName: user.name,
    actorRole: user.role,
    //req,
    action: AuditAction.LOGIN_SUCCESS as any,
    entityType: AuditEntityType.AUTH as any,
    //entityId: user.id,
    //entityRef: user.loginId || user.email || user.id,
    description: "Login success",
    meta: { userId: user.id, role: user.role, loginId: user.loginId, email: user.email },
  });

  return res;
}

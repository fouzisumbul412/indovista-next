import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
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
    return NextResponse.json({ error: "User not found" }, { status: 400 });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
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

  return res;
}

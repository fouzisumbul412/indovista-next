import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set("token", "", {
    httpOnly: true,
    path: "/",
    maxAge: -1,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

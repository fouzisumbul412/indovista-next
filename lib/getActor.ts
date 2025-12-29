// lib/getActor.ts
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";
import type { Role } from "@/lib/generated/prisma/browser";

export type Actor = {
  id: number;
  name: string;
  role: Role;
  loginId: string;
  email: string | null;
};

function parseCookies(cookieHeader: string | null) {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;

  cookieHeader.split(";").forEach((part) => {
    const [k, ...v] = part.trim().split("=");
    if (!k) return;
    out[k] = decodeURIComponent(v.join("=") || "");
  });
  return out;
}

export async function getActorFromRequest(req: Request): Promise<Actor | null> {
  const cookies = parseCookies(req.headers.get("cookie"));
  const token = cookies["token"];
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: Number(payload.id) },
    select: { id: true, name: true, role: true, loginId: true, email: true },
  });

  return user ? user : null;
}

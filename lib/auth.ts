// lib/auth.ts
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/generated/prisma/browser";

export type Actor = {
  userId: number;
  name: string;
  role: Role;
};

function parseCookie(cookieHeader: string | null) {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;

  cookieHeader.split(";").forEach((part) => {
    const [k, ...v] = part.trim().split("=");
    if (!k) return;
    out[k] = decodeURIComponent(v.join("=") || "");
  });
  return out;
}

/**
 * ✅ Reads actor from:
 * 1) request header: x-user-id
 * 2) cookie: uid
 * and loads name/role from DB.
 */
export async function getActor(req: Request): Promise<Actor | null> {
  const headerUserId = req.headers.get("x-user-id");
  const cookies = parseCookie(req.headers.get("cookie"));
  const cookieUserId = cookies["uid"];

  const raw = headerUserId || cookieUserId;
  if (!raw) return null;

  const userId = Number(raw);
  if (!Number.isFinite(userId)) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true },
  });

  if (!user) return null;

  return { userId: user.id, name: user.name, role: user.role };
}

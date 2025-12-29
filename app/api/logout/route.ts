import { NextResponse } from "next/server";
import { getActorFromRequest } from "@/lib/getActor";
import { logAudit } from "@/lib/audit";
import { AuditAction, AuditEntityType } from "@/lib/generated/prisma/browser";

function clearCookie(res: NextResponse) {
  res.cookies.set({
    name: "token",
    value: "",
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  return res;
}

export async function GET(req: Request) {
  const actor = await getActorFromRequest(req);

  if (actor) {
    await logAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: AuditAction.LOGOUT,
      entityType: AuditEntityType.USER,
      entityId: String(actor.id),
      entityRef: actor.loginId,
      description: `User logout: ${actor.name} (${actor.loginId})`,
    });
  }

  return clearCookie(NextResponse.json({ message: "Logout successful" }));
}

export async function POST(req: Request) {
  const actor = await getActorFromRequest(req);

  if (actor) {
    await logAudit({
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: AuditAction.LOGOUT,
      entityType: AuditEntityType.USER,
      entityId: String(actor.id),
      entityRef: actor.loginId,
      description: `User logout: ${actor.name} (${actor.loginId})`,
    });
  }

  return clearCookie(NextResponse.json({ message: "Logout successful" }));
}

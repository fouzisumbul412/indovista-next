// lib/audit.ts
import { prisma } from "@/lib/prisma";
import type { AuditAction, AuditEntityType, Role } from "@/lib/generated/prisma/browser";

function sanitizeForJson(value: any): any {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(sanitizeForJson);
  if (value && typeof value === "object") {
    const out: any = {};
    for (const k of Object.keys(value)) out[k] = sanitizeForJson(value[k]);
    return out;
  }
  return value;
}

export async function logAudit(params: {
  actorUserId?: number | null;
  actorName?: string | null;
  actorRole?: Role | null;

  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  entityRef?: string | null;
  description: string;
  meta?: any;
}) {
  return prisma.auditLog.create({
    data: {
      actorUserId: params.actorUserId ?? null,
      actorName: params.actorName ?? null,
      actorRole: params.actorRole ?? null,

      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      entityRef: params.entityRef ?? null,
      description: params.description,
      meta: params.meta ? sanitizeForJson(params.meta) : null,
    },
  });
}

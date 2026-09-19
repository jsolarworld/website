import "server-only";
import type { Prisma } from "../../generated/prisma/client";
import { db } from "../db";

type Json = Prisma.InputJsonValue;

/** Fields whose changes matter for the audit trail (price, stock and visibility, per PRD section 8). */
export const AUDITED_PRODUCT_FIELDS = [
  "name",
  "slug",
  "sku",
  "priceNgn",
  "salePriceNgn",
  "stock",
  "availableOnRequest",
  "status",
  "featured",
  "categoryId",
  "brandId",
] as const;

/** Only the fields that actually changed, as {before, after}. Empty when nothing audited changed. */
export function diffFields<T extends Record<string, unknown>>(before: T | null, after: T, fields: readonly (keyof T)[]) {
  const b: Record<string, unknown> = {};
  const a: Record<string, unknown> = {};
  for (const f of fields) {
    if (before === null || before[f] !== after[f]) {
      b[f as string] = before ? before[f] : null;
      a[f as string] = after[f];
    }
  }
  return { before: b, after: a, changed: Object.keys(a).length > 0 };
}

export async function logAudit(entry: {
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}) {
  await db.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      before: (entry.before ?? undefined) as Json | undefined,
      after: (entry.after ?? undefined) as Json | undefined,
    },
  });
}

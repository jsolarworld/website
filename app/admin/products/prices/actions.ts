"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/admin/audit";
import { requireStaff } from "@/lib/admin/guard";
import { adjustPrice, type Adjustment, type AdjustMode, type Rounding } from "@/lib/admin/pricing";
import { db } from "@/lib/db";

export interface PriceState {
  intent?: "preview" | "apply";
  fatal?: string;
  count?: number;
  skipped?: number;
  sample?: { name: string; before: number; after: number }[];
  applied?: boolean;
}

const ROUNDINGS: Rounding[] = [0, 100, 500, 1000];

export async function bulkPrices(_prev: PriceState, formData: FormData): Promise<PriceState> {
  const staff = await requireStaff("catalogue:write");
  const intent = formData.get("intent") === "apply" ? "apply" : "preview";

  const mode: AdjustMode = formData.get("mode") === "amount" ? "amount" : "percent";
  const value = Number(String(formData.get("value") ?? "").replace(/,/g, ""));
  const round = Number(formData.get("round")) as Rounding;
  if (!Number.isFinite(value) || value === 0) return { intent, fatal: "Enter how much to change prices by." };
  if (!ROUNDINGS.includes(round)) return { intent, fatal: "Choose a rounding." };
  // Guard rails against a typo turning into a catastrophe.
  if (mode === "percent" && (value > 100 || value < -50)) return { intent, fatal: "A percentage change must be between -50% and +100%." };
  if (mode === "amount" && Math.abs(value) > 10_000_000) return { intent, fatal: "That amount looks too large." };
  const adj: Adjustment = { mode, value, round };

  const categoryId = String(formData.get("categoryId") ?? "");
  const brandId = String(formData.get("brandId") ?? "");
  if (!categoryId && !brandId && formData.get("all") !== "on") {
    return { intent, fatal: "Choose a category or brand, or tick 'all products' to change everything." };
  }
  const includeSale = formData.get("includeSale") === "on";

  const products = await db.product.findMany({
    where: { status: { not: "ARCHIVED" }, ...(categoryId ? { categoryId } : {}), ...(brandId ? { brandId } : {}) },
    select: { id: true, name: true, priceNgn: true, salePriceNgn: true },
    orderBy: { name: "asc" },
  });

  const plan: { id: string; name: string; before: number; after: number; saleBefore: number | null; saleAfter: number | null }[] = [];
  let skipped = 0;
  for (const p of products) {
    const after = adjustPrice(p.priceNgn, adj);
    if (after == null) {
      skipped++;
      continue;
    }
    let saleAfter = p.salePriceNgn;
    if (includeSale && p.salePriceNgn != null) saleAfter = adjustPrice(p.salePriceNgn, adj);
    // A sale price must stay below the price.
    if (saleAfter != null && saleAfter >= after) saleAfter = null;
    if (after === p.priceNgn && saleAfter === p.salePriceNgn) continue;
    plan.push({ id: p.id, name: p.name, before: p.priceNgn, after, saleBefore: p.salePriceNgn, saleAfter });
  }

  const base: PriceState = {
    intent,
    count: plan.length,
    skipped,
    sample: plan.slice(0, 10).map((p) => ({ name: p.name, before: p.before, after: p.after })),
  };
  if (intent === "preview") return base;

  if (formData.get("confirm") !== "on") return { ...base, fatal: "Tick the box to confirm you want to change these prices." };
  if (plan.length === 0) return { ...base, fatal: "No prices would change." };

  try {
    for (let i = 0; i < plan.length; i += 20) {
      await Promise.all(plan.slice(i, i + 20).map((p) => db.product.update({ where: { id: p.id }, data: { priceNgn: p.after, salePriceNgn: p.saleAfter } })));
    }
    await logAudit({
      actorId: staff.id,
      action: "product.bulk_price",
      entity: "Product",
      entityId: "bulk",
      after: {
        adjustment: adj,
        includeSale,
        categoryId: categoryId || null,
        brandId: brandId || null,
        count: plan.length,
        changes: plan.slice(0, 1000).map((p) => ({ id: p.id, before: p.before, after: p.after, saleBefore: p.saleBefore, saleAfter: p.saleAfter })),
      },
    });
  } catch (e) {
    console.error("bulkPrices failed", e);
    return { ...base, fatal: "The change stopped part-way. Check the product list; running it again would apply the change twice to products already updated." };
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/solar-quote");
  return { ...base, applied: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/admin/audit";
import { requireStaff } from "@/lib/admin/guard";
import { planImport, type ImportContext, type ImportRow } from "@/lib/admin/product-import";
import type { SpecField } from "@/lib/admin/product-form";
import { db } from "@/lib/db";

export interface ImportState {
  intent?: "preview" | "apply";
  fatal?: string;
  created?: number;
  updated?: number;
  errors?: { line: number; message: string }[];
  sample?: { action: string; sku: string; name: string; price: string }[];
  applied?: boolean;
}

const MAX_BYTES = 900_000; // Server actions accept ~1 MB by default.

export async function importProducts(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const staff = await requireStaff("catalogue:write");
  const intent = formData.get("intent") === "apply" ? "apply" : "preview";
  const csv = String(formData.get("csv") ?? "");
  if (csv.trim() === "") return { intent, fatal: "Choose a CSV file first." };
  if (csv.length > MAX_BYTES) return { intent, fatal: "That file is too large. Split it into two files." };

  const [categories, brands, products] = await Promise.all([
    db.category.findMany(),
    db.brand.findMany(),
    db.product.findMany({ select: { id: true, sku: true, slug: true, priceNgn: true, salePriceNgn: true, stock: true, status: true, categoryId: true, specs: true } }),
  ]);
  const existing: ImportContext["existing"] = new Map();
  const specsBySku = new Map<string, Record<string, string | number>>();
  for (const p of products) {
    if (!p.sku) continue;
    existing.set(p.sku, { id: p.id, slug: p.slug, priceNgn: p.priceNgn, salePriceNgn: p.salePriceNgn, stock: p.stock, status: p.status, categoryId: p.categoryId });
    specsBySku.set(p.sku, (p.specs ?? {}) as Record<string, string | number>);
  }
  const ctx: ImportContext = {
    categories: categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name, specTemplate: (c.specTemplate ?? []) as unknown as SpecField[] })),
    brands: brands.map((b) => ({ id: b.id, slug: b.slug, name: b.name })),
    existing,
    takenSlugs: new Set(products.map((p) => p.slug)),
  };

  // Always re-plan on the server: the preview is only a preview, never trusted on apply.
  const report = planImport(csv, ctx);
  const base: ImportState = {
    intent,
    created: report.created,
    updated: report.updated,
    errors: report.errors.slice(0, 100),
    sample: report.rows.slice(0, 15).map((r) => ({
      action: r.action,
      sku: r.sku,
      name: r.fields.name ?? "(unchanged)",
      price: r.fields.priceNgn != null ? String(r.fields.priceNgn) : "(unchanged)",
    })),
  };
  if (intent === "preview") return base;

  // All or nothing: a half-imported catalogue is harder to fix than a file with a typo.
  if (report.errors.length > 0) return { ...base, fatal: "Fix the errors below, then check the file again. Nothing was imported." };
  if (report.rows.length === 0) return { ...base, fatal: "The file has no rows to import." };

  const creates = report.rows.filter((r) => r.action === "create");
  const updates = report.rows.filter((r) => r.action === "update");

  try {
    if (creates.length) {
      await db.product.createMany({
        data: creates.map((r) => ({
          kind: "PRODUCT" as const,
          slug: r.slug,
          sku: r.sku,
          name: r.fields.name!,
          categoryId: r.fields.categoryId!,
          brandId: r.fields.brandId ?? null,
          priceNgn: r.fields.priceNgn!,
          salePriceNgn: r.fields.salePriceNgn ?? null,
          stock: r.fields.stock ?? 0,
          status: r.fields.status ?? "DRAFT",
          warranty: r.fields.warranty ?? null,
          description: r.fields.description ?? null,
          featured: r.fields.featured ?? false,
          availableOnRequest: r.fields.availableOnRequest ?? false,
          specs: r.fields.specs ?? {},
        })),
      });
    }
    // Updates are independent rows: run them in modest parallel batches (the database is far away).
    const changes: Record<string, unknown>[] = [];
    for (let i = 0; i < updates.length; i += 20) {
      await Promise.all(
        updates.slice(i, i + 20).map((r) => {
          const prev = existing.get(r.sku)!;
          const data = updateData(r, prev, specsBySku.get(r.sku) ?? {});
          if (data.priceNgn != null || data.stock != null || data.status != null) {
            changes.push({ sku: r.sku, priceBefore: prev.priceNgn, priceAfter: data.priceNgn ?? prev.priceNgn, stockBefore: prev.stock, stockAfter: data.stock ?? prev.stock });
          }
          return db.product.update({ where: { id: prev.id }, data });
        }),
      );
    }
    await logAudit({
      actorId: staff.id,
      action: "product.import",
      entity: "Product",
      entityId: "bulk",
      after: { created: creates.length, updated: updates.length, changes: changes.slice(0, 1000) },
    });
  } catch (e) {
    console.error("importProducts failed", e);
    const code = (e as { code?: string }).code;
    return { ...base, fatal: code === "P2002" ? "A SKU or web address in the file is already used by another product." : "The import failed part-way. Check the product list, fix the file and import again (rows already saved will simply update)." };
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/solar-quote");
  return { ...base, applied: true };
}

function updateData(r: ImportRow, prev: ImportContext["existing"] extends Map<string, infer V> ? V : never, prevSpecs: Record<string, string | number>) {
  const f = r.fields;
  const data: Record<string, unknown> = {};
  if (f.name) data.name = f.name;
  if (f.categoryId) data.categoryId = f.categoryId;
  if (f.brandId !== undefined) data.brandId = f.brandId;
  if (f.priceNgn != null) data.priceNgn = f.priceNgn;
  if (f.salePriceNgn != null) data.salePriceNgn = f.salePriceNgn;
  if (f.stock != null) data.stock = f.stock;
  if (f.status) data.status = f.status;
  if (f.warranty !== undefined) data.warranty = f.warranty;
  if (f.description !== undefined) data.description = f.description;
  if (f.featured !== undefined) data.featured = f.featured;
  if (f.availableOnRequest !== undefined) data.availableOnRequest = f.availableOnRequest;
  if (f.specs) data.specs = { ...prevSpecs, ...f.specs };
  // A price drop must not leave an old sale price at or above the new price.
  const newPrice = (data.priceNgn as number | undefined) ?? prev.priceNgn;
  const sale = (data.salePriceNgn as number | undefined) ?? prev.salePriceNgn;
  if (sale != null && sale >= newPrice) data.salePriceNgn = null;
  return data;
}

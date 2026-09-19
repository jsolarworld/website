import { parseCsvRecords } from "../csv";
import { slugify, uniqueSlug } from "../slug";
import type { SpecField } from "./product-form";

/**
 * Validate a product CSV against the current catalogue (PRD ADM-03). Pure: the caller supplies the
 * lookups and gets back exactly what would be created or updated, plus row-level errors.
 *
 * Rules: SKU is the key. A SKU that exists is UPDATED (blank cells leave a value unchanged); a new SKU is
 * CREATED and needs name, category and price. Nothing is deleted.
 */

export interface ImportContext {
  categories: { id: string; slug: string; name: string; specTemplate: SpecField[] }[];
  brands: { id: string; slug: string; name: string }[];
  /** Existing products by SKU. */
  existing: Map<string, { id: string; slug: string; priceNgn: number; salePriceNgn: number | null; stock: number; status: string; categoryId: string }>;
  takenSlugs: Set<string>;
}

export interface ImportFields {
  name?: string;
  categoryId?: string;
  brandId?: string | null;
  priceNgn?: number;
  salePriceNgn?: number | null;
  stock?: number;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  warranty?: string | null;
  description?: string | null;
  featured?: boolean;
  availableOnRequest?: boolean;
  specs?: Record<string, string | number>;
}

export interface ImportRow {
  line: number;
  action: "create" | "update";
  sku: string;
  slug: string; // final slug for creates, current slug for updates
  fields: ImportFields;
}

export interface ImportReport {
  rows: ImportRow[];
  errors: { line: number; message: string }[];
  created: number;
  updated: number;
}

const MAX_ROWS = 2000;

const num = (raw: string): number | null => {
  const n = Number(raw.replace(/[₦,\s]/g, ""));
  return raw.trim() !== "" && Number.isFinite(n) ? n : null;
};
const yes = (raw: string) => ["yes", "y", "true", "1", "on"].includes(raw.trim().toLowerCase());

export function planImport(csv: string, ctx: ImportContext): ImportReport {
  const { headers, records } = parseCsvRecords(csv);
  const errors: ImportReport["errors"] = [];
  const rows: ImportRow[] = [];

  if (!headers.includes("sku")) return { rows, errors: [{ line: 1, message: 'The file needs a "sku" column' }], created: 0, updated: 0 };
  if (records.length > MAX_ROWS) return { rows, errors: [{ line: 1, message: `Too many rows (max ${MAX_ROWS} per file)` }], created: 0, updated: 0 };

  const catBy = new Map<string, ImportContext["categories"][number]>();
  for (const c of ctx.categories) {
    catBy.set(c.slug.toLowerCase(), c);
    catBy.set(c.name.toLowerCase(), c);
  }
  const brandBy = new Map<string, ImportContext["brands"][number]>();
  for (const b of ctx.brands) {
    brandBy.set(b.slug.toLowerCase(), b);
    brandBy.set(b.name.toLowerCase(), b);
  }

  const taken = new Set(ctx.takenSlugs);
  const seenSkus = new Set<string>();

  records.forEach((r, i) => {
    const line = i + 2; // header is line 1
    const fail = (message: string) => errors.push({ line, message });

    const sku = r.sku;
    if (!sku) return fail("Missing SKU");
    if (seenSkus.has(sku.toLowerCase())) return fail(`SKU ${sku} appears twice in this file`);
    seenSkus.add(sku.toLowerCase());

    const existing = ctx.existing.get(sku);
    const fields: ImportFields = {};
    let bad = false;
    const err = (m: string) => {
      fail(`${sku}: ${m}`);
      bad = true;
    };

    if (r.name) fields.name = r.name.slice(0, 140);

    let category = ctx.categories.find((c) => c.id === existing?.categoryId);
    if (r.category) {
      const found = catBy.get(r.category.toLowerCase());
      if (!found) err(`unknown category "${r.category}"`);
      else {
        category = found;
        fields.categoryId = found.id;
      }
    }

    if (r.brand) {
      const b = brandBy.get(r.brand.toLowerCase());
      if (!b) err(`unknown brand "${r.brand}" (add it first, or fix the spelling)`);
      else fields.brandId = b.id;
    }

    if (r.price) {
      const n = num(r.price);
      if (n == null || !Number.isInteger(n) || n < 1 || n > 1_000_000_000) err(`price "${r.price}" is not a whole number of naira`);
      else fields.priceNgn = n;
    }
    if (r.sale_price) {
      const n = num(r.sale_price);
      if (n == null || !Number.isInteger(n) || n < 1) err(`sale_price "${r.sale_price}" is not a whole number of naira`);
      else fields.salePriceNgn = n;
    }
    const finalPrice = fields.priceNgn ?? existing?.priceNgn;
    if (fields.salePriceNgn != null && finalPrice != null && fields.salePriceNgn >= finalPrice) err("sale_price must be lower than price");

    if (r.stock) {
      const n = num(r.stock);
      if (n == null || !Number.isInteger(n) || n < 0 || n > 100_000) err(`stock "${r.stock}" must be a whole number`);
      else fields.stock = n;
    }

    if (r.status) {
      const st = r.status.toUpperCase();
      if (st === "DRAFT" || st === "PUBLISHED" || st === "ARCHIVED") fields.status = st;
      else err(`status "${r.status}" must be draft, published or archived`);
    }
    if (r.warranty) fields.warranty = r.warranty.slice(0, 200);
    if (r.description) fields.description = r.description.slice(0, 4000);
    if (r.featured) fields.featured = yes(r.featured);
    if (r.available_on_request) fields.availableOnRequest = yes(r.available_on_request);

    // spec_<key> columns, checked against the category's template.
    const specs: Record<string, string | number> = {};
    for (const h of headers.filter((h) => h.startsWith("spec_"))) {
      const raw = r[h];
      if (!raw) continue;
      const key = h.slice(5);
      const field = category?.specTemplate.find((f) => f.key.toLowerCase() === key);
      if (!field) {
        err(`${h} is not a spec of ${category?.name ?? "this category"}`);
        continue;
      }
      if (field.unit) {
        const n = num(raw);
        if (n == null || n < 0) err(`${h} "${raw}" must be a number`);
        else specs[field.key] = n;
      } else specs[field.key] = raw.slice(0, 100);
    }
    if (Object.keys(specs).length) fields.specs = specs;

    if (!existing) {
      if (!fields.name) err("new products need a name");
      if (!fields.categoryId && !r.category) err("new products need a category");
      if (fields.priceNgn == null && !r.price) err("new products need a price");
    }
    if (bad) return;

    let slug = existing?.slug ?? "";
    if (!existing) {
      slug = uniqueSlug(slugify(fields.name!), taken);
      taken.add(slug);
    }
    rows.push({ line, action: existing ? "update" : "create", sku, slug, fields });
  });

  return {
    rows,
    errors,
    created: rows.filter((r) => r.action === "create").length,
    updated: rows.filter((r) => r.action === "update").length,
  };
}

import { MAX_MEDIA, isCloudinaryMedia, type MediaItem, type MediaKind } from "../media";
import { slugify } from "../slug";

/** What the admin product form submits, validated. Pure so it can be tested without a browser. */

export interface SpecField {
  key: string;
  label: string;
  unit?: string;
  filterable?: boolean;
}

export interface ProductInput {
  kind: "PRODUCT" | "PACKAGE";
  name: string;
  slug: string;
  sku: string | null;
  description: string | null;
  categoryId: string;
  brandId: string | null;
  priceNgn: number;
  salePriceNgn: number | null;
  stock: number;
  lowStockThreshold: number;
  availableOnRequest: boolean;
  warranty: string | null;
  weightKg: number | null;
  datasheetUrl: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  featured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  specs: Record<string, string | number>;
  media: MediaItem[];
  package: PackageInput | null;
}

export interface PackageInput {
  chemistry: "LITHIUM" | "TUBULAR";
  inverterContinuousW: number;
  inverterSurgeW: number;
  batteryWh: number;
  arrayW: number;
  whatItCanPower: string | null;
  approved: boolean;
  components: { componentId: string; quantity: number }[];
}

export type FormErrors = Record<string, string>;
export type ParseResult = { ok: true; data: ProductInput } | { ok: false; errors: FormErrors };

interface FormLike {
  get(name: string): FormDataEntryValue | null;
}

const MAX_PRICE = 1_000_000_000;

export function parseProductForm(form: FormLike, specTemplate: SpecField[]): ParseResult {
  const errors: FormErrors = {};
  const text = (name: string, max: number) => {
    const v = form.get(name);
    if (typeof v !== "string") return null;
    const t = v.trim().slice(0, max);
    return t === "" ? null : t;
  };
  const int = (name: string, min: number, max: number, label: string, required = true): number | null => {
    const raw = text(name, 20);
    if (raw == null) {
      if (required) errors[name] = `${label} is required`;
      return null;
    }
    const n = Number(raw.replace(/,/g, ""));
    if (!Number.isInteger(n) || n < min || n > max) {
      errors[name] = `${label} must be a whole number from ${min.toLocaleString("en-NG")} to ${max.toLocaleString("en-NG")}`;
      return null;
    }
    return n;
  };
  const checked = (name: string) => form.get(name) === "on" || form.get(name) === "true";

  const kind = form.get("kind") === "PACKAGE" ? "PACKAGE" : "PRODUCT";
  const name = text("name", 140);
  if (!name || name.length < 3) errors.name = "Enter the product name (at least 3 letters)";

  const slugRaw = text("slug", 80);
  const slug = slugRaw ?? slugify(name ?? "");
  if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) errors.slug = "Use lowercase letters, numbers and single hyphens only";

  const categoryId = text("categoryId", 60);
  if (!categoryId) errors.categoryId = "Choose a category";

  const priceNgn = int("priceNgn", 1, MAX_PRICE, "Price");
  const salePriceNgn = int("salePriceNgn", 1, MAX_PRICE, "Sale price", false);
  if (priceNgn != null && salePriceNgn != null && salePriceNgn >= priceNgn) errors.salePriceNgn = "Sale price must be lower than the normal price";

  const stock = int("stock", 0, 100_000, "Stock") ?? 0;
  const lowStockThreshold = int("lowStockThreshold", 0, 10_000, "Low-stock level", false) ?? 2;

  const datasheetUrl = text("datasheetUrl", 500);
  if (datasheetUrl && !/^https:\/\/\S+$/.test(datasheetUrl)) errors.datasheetUrl = "Datasheet link must start with https://";

  const weightRaw = text("weightKg", 10);
  let weightKg: number | null = null;
  if (weightRaw != null) {
    weightKg = Number(weightRaw);
    if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 5000) {
      errors.weightKg = "Weight must be a positive number in kg";
      weightKg = null;
    }
  }

  const statusRaw = form.get("status");
  const status = statusRaw === "PUBLISHED" || statusRaw === "ARCHIVED" ? statusRaw : "DRAFT";

  // Specs: only keys in the category's template are kept; fields with a unit must be numbers.
  const specs: Record<string, string | number> = {};
  for (const f of specTemplate) {
    const raw = text(`spec.${f.key}`, 100);
    if (raw == null) continue;
    if (f.unit) {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) errors[`spec.${f.key}`] = `${f.label} must be a number`;
      else specs[f.key] = n;
    } else specs[f.key] = raw;
  }

  // Photos and videos arrive as JSON from the uploader: [{ kind, url, alt }]. Every item needs a description (PRD SEO-09).
  const media: MediaItem[] = [];
  const mediaRaw = form.get("media");
  if (typeof mediaRaw === "string" && mediaRaw.trim() !== "") {
    try {
      const parsed: unknown = JSON.parse(mediaRaw);
      if (!Array.isArray(parsed) || parsed.length > MAX_MEDIA) throw new Error("bad");
      for (const it of parsed) {
        const kind: MediaKind = it?.kind === "VIDEO" ? "VIDEO" : "IMAGE";
        const url = typeof it?.url === "string" ? it.url : "";
        const alt = typeof it?.alt === "string" ? it.alt.trim().slice(0, 200) : "";
        if (!isCloudinaryMedia(kind, url)) throw new Error("bad");
        if (!alt) {
          errors.media = "Every photo and video needs a short description";
          break;
        }
        media.push({ kind, url, alt });
      }
    } catch {
      errors.media = "Photos or videos could not be read. Remove them and upload again.";
    }
  }

  let pkg: PackageInput | null = null;
  if (kind === "PACKAGE") {
    const chemistry = form.get("pkg.chemistry") === "TUBULAR" ? "TUBULAR" : "LITHIUM";
    const inverterContinuousW = int("pkg.inverterContinuousW", 1, 200_000, "Inverter continuous watts");
    const inverterSurgeW = int("pkg.inverterSurgeW", 1, 400_000, "Inverter surge watts");
    const batteryWh = int("pkg.batteryWh", 1, 2_000_000, "Battery capacity (Wh)");
    const arrayW = int("pkg.arrayW", 1, 1_000_000, "Solar array watts");
    if (inverterContinuousW != null && inverterSurgeW != null && inverterSurgeW < inverterContinuousW) {
      errors["pkg.inverterSurgeW"] = "Surge watts cannot be lower than continuous watts";
    }

    const components: { componentId: string; quantity: number }[] = [];
    const compRaw = form.get("components");
    try {
      const parsed: unknown = typeof compRaw === "string" && compRaw ? JSON.parse(compRaw) : [];
      if (!Array.isArray(parsed)) throw new Error("bad");
      const seen = new Set<string>();
      for (const c of parsed) {
        const componentId = typeof c?.componentId === "string" ? c.componentId : "";
        const quantity = Number(c?.quantity);
        if (!componentId || !Number.isInteger(quantity) || quantity < 1 || quantity > 999 || seen.has(componentId)) throw new Error("bad");
        seen.add(componentId);
        components.push({ componentId, quantity });
      }
    } catch {
      errors.components = "Check the package contents: each item once, with a quantity of 1 or more";
    }
    if (!errors.components && components.length === 0) errors.components = "Add at least one item to this package";

    if (inverterContinuousW != null && inverterSurgeW != null && batteryWh != null && arrayW != null) {
      pkg = {
        chemistry,
        inverterContinuousW,
        inverterSurgeW,
        batteryWh,
        arrayW,
        whatItCanPower: text("pkg.whatItCanPower", 300),
        approved: checked("pkg.approved"),
        components,
      };
    }
  }

  if (Object.keys(errors).length > 0 || !name || !categoryId || priceNgn == null) return { ok: false, errors };

  return {
    ok: true,
    data: {
      kind,
      name,
      slug,
      sku: text("sku", 60),
      description: text("description", 4000),
      categoryId,
      brandId: text("brandId", 60),
      priceNgn,
      salePriceNgn,
      stock,
      lowStockThreshold,
      availableOnRequest: checked("availableOnRequest"),
      warranty: text("warranty", 200),
      weightKg,
      datasheetUrl,
      status,
      featured: checked("featured"),
      seoTitle: text("seoTitle", 70),
      seoDescription: text("seoDescription", 170),
      specs,
      media,
      package: pkg,
    },
  };
}

import type { SpecField } from "./product-form";

/**
 * What a product still lacks, so staff can find the gaps on the dashboard and fill them in.
 * Pure, so the product list, the dashboard, the product form and the tests share one rule.
 */

/**
 * Spec fields the quote tool reads, per category slug. An inner list means any one of them will do
 * (a lithium battery's kWh can be worked out from its Ah and voltage).
 */
export const QUOTE_FIELDS: Record<string, (string | string[])[]> = {
  inverters: ["ratedContinuousW", "surgeW", "systemVoltage"],
  "inverter-and-battery-sets": ["ratedContinuousW", "surgeW", "batteryKwh"],
  "lithium-batteries": [["capacityKwh", "capacityAh"], "voltage"],
  "tubular-batteries": ["capacityAh", "voltage"],
  "drycell-batteries": ["capacityAh", "voltage"],
  "solar-panels": ["watts"],
};

/** The quote tool groups inverters and batteries by brand. Panels can go with any brand. */
const BRAND_NEEDED = new Set(["inverters", "inverter-and-battery-sets", "lithium-batteries", "tubular-batteries", "drycell-batteries"]);

/** The product list's "Missing" filter. */
export const MISSING_FILTERS = {
  price: "Price",
  photo: "Photo or video",
  quote: "Quote tool details",
} as const;
export type MissingFilter = keyof typeof MISSING_FILTERS;

export const isMissingFilter = (v: unknown): v is MissingFilter => typeof v === "string" && Object.hasOwn(MISSING_FILTERS, v);

export interface MissingInput {
  kind: "PRODUCT" | "PACKAGE";
  priceNgn: number | null;
  brandId: string | null;
  mediaCount: number;
  categorySlug: string;
  specTemplate: SpecField[];
  specs: unknown;
}
type QuoteCheck = Omit<MissingInput, "mediaCount">;

/** Packages carry their own sizing fields (always required), so only single products are checked. */
export const usedByQuoteTool = (p: Pick<MissingInput, "kind" | "categorySlug">) => p.kind === "PRODUCT" && Object.hasOwn(QUOTE_FIELDS, p.categorySlug);

/** Spec keys the quote tool reads for a category, for the product form's hints. */
export const quoteSpecKeys = (categorySlug: string): string[] => (Object.hasOwn(QUOTE_FIELDS, categorySlug) ? QUOTE_FIELDS[categorySlug].flat() : []);

export const brandNeeded = (categorySlug: string) => BRAND_NEEDED.has(categorySlug);

const filled = (v: unknown) => (typeof v === "number" ? v > 0 : typeof v === "string" && v.trim() !== "");

/** "Rated continuous power" with unit W reads as "rated continuous power (W)" in a list. */
function labelOf(keys: string[], template: SpecField[]): string {
  const fields = keys.map((k) => template.find((f) => f.key === k) ?? { key: k, label: k, unit: undefined });
  const units = fields.map((f) => f.unit).filter(Boolean);
  const label = fields[0].label;
  return `${label.charAt(0).toLowerCase()}${label.slice(1)}${units.length ? ` (${units.join(" or ")})` : ""}`;
}

/** Brand and ratings the quote tool needs but cannot find. Empty when it does not read this kind of product. */
function quoteGaps(p: QuoteCheck): string[] {
  if (!usedByQuoteTool(p)) return [];
  const gaps: string[] = [];
  if (brandNeeded(p.categorySlug) && !p.brandId) gaps.push("brand");
  const specs = (typeof p.specs === "object" && p.specs !== null ? p.specs : {}) as Record<string, unknown>;
  for (const need of QUOTE_FIELDS[p.categorySlug]) {
    const keys = typeof need === "string" ? [need] : need;
    if (!keys.some((k) => filled(specs[k]))) gaps.push(labelOf(keys, p.specTemplate));
  }
  return gaps;
}

/** Everything worth filling in, in the order staff should see it: price, photo, then what the quote tool needs. */
export function missingDetails(p: MissingInput): string[] {
  return [...(p.priceNgn == null ? ["price"] : []), ...(p.mediaCount === 0 ? ["photo"] : []), ...quoteGaps(p)];
}

/** True when the quote tool reads this kind of product but cannot use this one yet (a photo is not needed). */
export const lacksQuoteDetails = (p: QuoteCheck) => usedByQuoteTool(p) && (p.priceNgn == null || quoteGaps(p).length > 0);

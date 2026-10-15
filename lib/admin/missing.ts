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

/**
 * Ratings the quote tool can work without, though staff are still asked for them: with no surge
 * rating it counts on the continuous rating alone, so the inverter is offered for fewer homes.
 */
const QUOTE_OPTIONAL = new Set(["surgeW"]);

/**
 * A rating the quote tool can work out from another field, though staff are still asked for the real one:
 * an inverter with only its kVA figure is counted at a share of it (`inverterPowerFactor` in the quote settings).
 */
const QUOTE_STAND_IN: Record<string, string> = { ratedContinuousW: "ratedKva" };

/**
 * Datasheet figures for the quote's checks (sizing spec, 2026-10-14): the panel wiring, the battery's
 * currents, and the inverter's own losses. Never needed (`lacksQuoteDetails` ignores them; a check runs
 * only once its figures are entered), but staff are asked for them, one group to a gap so the line stays short.
 */
const INVERTER_DATASHEET = [
  { label: "efficiency and no-load consumption", keys: ["efficiency", "idleW"] },
  { label: "solar input limits", keys: ["pvMaxW", "pvMaxVoc", "mpptMinV", "mpptMaxV", "mpptCount", "pvMaxIscA"] },
  { label: "max battery charge current", keys: ["maxChargeA"] },
];
const LEAD_ACID_DATASHEET = [{ label: "max charge current", keys: ["maxChargeA"] }];
export const QUOTE_DATASHEET: Record<string, { label: string; keys: string[] }[]> = {
  inverters: INVERTER_DATASHEET,
  "inverter-and-battery-sets": INVERTER_DATASHEET,
  "lithium-batteries": [
    { label: "charge and discharge current", keys: ["maxChargeA", "maxDischargeA"] },
    { label: "how many can be joined in parallel", keys: ["maxParallel"] },
  ],
  "tubular-batteries": LEAD_ACID_DATASHEET,
  "drycell-batteries": LEAD_ACID_DATASHEET,
  "solar-panels": [{ label: "Voc, Vmp and Isc", keys: ["voltageVoc", "voltageVmp", "currentIsc"] }],
};

/** Datasheet keys for a category, for the product form's hints. */
export const datasheetKeys = (categorySlug: string): string[] => (QUOTE_DATASHEET[categorySlug] ?? []).flatMap((g) => g.keys);

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

/**
 * Brand and ratings the quote tool reads but cannot find. Empty when it does not read this kind of product.
 * `blockingOnly` leaves out the ratings it can work without.
 */
function quoteGaps(p: QuoteCheck, blockingOnly = false): string[] {
  if (!usedByQuoteTool(p)) return [];
  const gaps: string[] = [];
  if (brandNeeded(p.categorySlug) && !p.brandId) gaps.push("brand");
  const specs = (typeof p.specs === "object" && p.specs !== null ? p.specs : {}) as Record<string, unknown>;
  for (const need of QUOTE_FIELDS[p.categorySlug]) {
    const keys = typeof need === "string" ? [need] : need;
    if (blockingOnly && (keys.every((k) => QUOTE_OPTIONAL.has(k)) || keys.some((k) => Object.hasOwn(QUOTE_STAND_IN, k) && filled(specs[QUOTE_STAND_IN[k]])))) continue;
    if (!keys.some((k) => filled(specs[k]))) gaps.push(labelOf(keys, p.specTemplate));
  }
  return gaps;
}

/** Datasheet groups with any figure still empty, for single products the quote tool reads. */
function datasheetGaps(p: QuoteCheck): string[] {
  if (!usedByQuoteTool(p)) return [];
  const specs = (typeof p.specs === "object" && p.specs !== null ? p.specs : {}) as Record<string, unknown>;
  return (QUOTE_DATASHEET[p.categorySlug] ?? []).filter((g) => g.keys.some((k) => !filled(specs[k]))).map((g) => g.label);
}

/** Everything worth filling in, in the order staff should see it: price, photo, what the quote tool needs, then the datasheet figures. */
export function missingDetails(p: MissingInput): string[] {
  return [...(p.priceNgn == null ? ["price"] : []), ...(p.mediaCount === 0 ? ["photo"] : []), ...quoteGaps(p), ...datasheetGaps(p)];
}

/**
 * True when the quote tool reads this kind of product but cannot use this one yet. A photo, a price and
 * a surge rating are not needed (with no price the quote lists the product as "price on request"), and
 * an inverter's kVA figure will do until its rated watts are entered.
 */
export const lacksQuoteDetails = (p: QuoteCheck) => quoteGaps(p, true).length > 0;

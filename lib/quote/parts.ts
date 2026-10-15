import { lacksQuoteDetails } from "../admin/missing";
import { DEFAULT_SETTINGS } from "./defaults";
import type { Parts } from "./systems";

/** A published catalogue product as the system builder needs it. */
export interface PartRow {
  id: string;
  name: string;
  slug: string;
  /** What the customer pays today (sale price when on sale). Null when no price is set. */
  price: number | null;
  stock: number;
  availableOnRequest: boolean;
  brandId: string | null;
  brandName: string | null;
  categorySlug: string;
  specs: unknown;
}

// Three-phase and high-voltage equipment needs a designed system, so it is never offered automatically.
const ENGINEER_ONLY = /three[- ]?phase|3[- ]?phase|high[- ]?voltage/i;

/**
 * Sort catalogue products into the parts the system builder reads. A product missing anything the
 * quote tool needs (the same rule as the dashboard's "Missing" filter) is left out, never guessed.
 * `powerFactor` is the share of its kVA figure an inverter is counted at while its rated watts are not entered.
 */
export function toParts(rows: PartRow[], powerFactor = DEFAULT_SETTINGS.inverterPowerFactor): Parts {
  const parts: Parts = { inverters: [], batteries: [], sets: [], panels: [] };
  for (const r of rows) {
    if (lacksQuoteDetails({ kind: "PRODUCT", priceNgn: r.price, brandId: r.brandId, categorySlug: r.categorySlug, specTemplate: [], specs: r.specs })) continue;
    const specs = (r.specs ?? {}) as Record<string, unknown>;
    // The CSV import can leave a rating as text; anything that is not a positive number counts as 0.
    const n = (key: string) => {
      const v = typeof specs[key] === "string" ? Number(specs[key]) : specs[key];
      return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0;
    };
    // Datasheet figures for the quote's checks (sizing spec, 2026-10-14): null until entered, and a check then is skipped.
    const opt = (key: string) => n(key) || null;
    // Counts (inputs, batteries) are whole numbers.
    const count = (key: string) => (Math.floor(n(key)) >= 1 ? Math.floor(n(key)) : null);
    const base = { id: r.id, name: r.name, slug: r.slug, price: r.price, stock: r.availableOnRequest ? null : r.stock };
    const brand = r.brandName ?? "";
    // With only a kVA figure, the inverter is counted at the usual power factor until its real watts are entered.
    const continuousW = n("ratedContinuousW") || n("ratedKva") * 1000 * powerFactor;
    // With no surge rating entered, count on the continuous rating: an inverter can always start what it can run.
    const surgeW = n("surgeW") || continuousW;
    if (ENGINEER_ONLY.test(`${r.name} ${typeof specs.type === "string" ? specs.type : ""}`)) continue;
    // Entered as a percentage (93), or by some as a fraction (0.93); anything else is ignored.
    const eff = n("efficiency") > 1 ? n("efficiency") / 100 : n("efficiency");
    const datasheet = {
      efficiency: eff >= 0.5 && eff <= 1 ? eff : null,
      idleW: opt("idleW"),
      maxChargeA: opt("maxChargeA"),
      pv: { maxW: opt("pvMaxW"), maxVoc: opt("pvMaxVoc"), mpptMinV: opt("mpptMinV"), mpptMaxV: opt("mpptMaxV"), mpptCount: count("mpptCount"), maxIscA: opt("pvMaxIscA") },
    };

    switch (r.categorySlug) {
      case "inverters":
        parts.inverters.push({ ...base, ...datasheet, brand, continuousW, surgeW, systemVoltage: n("systemVoltage") });
        break;
      case "inverter-and-battery-sets":
        parts.sets.push({ ...base, ...datasheet, brand, continuousW, surgeW, batteryWh: n("batteryKwh") * 1000, systemVoltage: n("systemVoltage") });
        break;
      case "lithium-batteries":
        parts.batteries.push({
          ...base,
          brand,
          chemistry: "lithium",
          wh: n("capacityKwh") * 1000 || n("capacityAh") * n("voltage"),
          voltage: n("voltage"),
          maxChargeA: opt("maxChargeA"),
          maxDischargeA: opt("maxDischargeA"),
          maxParallel: count("maxParallel"),
        });
        break;
      // Drycell (gel/AGM) batteries are sized like tubular ones: both are lead-acid.
      case "tubular-batteries":
      case "drycell-batteries":
        parts.batteries.push({ ...base, brand, chemistry: "tubular", wh: n("capacityAh") * n("voltage"), voltage: n("voltage"), maxChargeA: opt("maxChargeA") });
        break;
      case "solar-panels":
        parts.panels.push({ ...base, watts: n("watts"), voc: opt("voltageVoc"), vmp: opt("voltageVmp"), isc: opt("currentIsc") });
        break;
    }
  }
  // A rating that turned out not to be a number would divide by zero in the builder.
  parts.batteries = parts.batteries.filter((b) => b.wh > 0);
  parts.panels = parts.panels.filter((p) => p.watts > 0);
  return parts;
}

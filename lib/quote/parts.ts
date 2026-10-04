import { lacksQuoteDetails } from "../admin/missing";
import type { Parts } from "./systems";

/** A published, priced catalogue product as the system builder needs it. */
export interface PartRow {
  id: string;
  name: string;
  slug: string;
  /** What the customer pays today (sale price when on sale). */
  price: number;
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
 */
export function toParts(rows: PartRow[]): Parts {
  const parts: Parts = { inverters: [], batteries: [], sets: [], panels: [] };
  for (const r of rows) {
    if (lacksQuoteDetails({ kind: "PRODUCT", priceNgn: r.price, brandId: r.brandId, categorySlug: r.categorySlug, specTemplate: [], specs: r.specs })) continue;
    const specs = (r.specs ?? {}) as Record<string, unknown>;
    // The CSV import can leave a rating as text; anything that is not a positive number counts as 0.
    const n = (key: string) => {
      const v = typeof specs[key] === "string" ? Number(specs[key]) : specs[key];
      return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0;
    };
    const base = { id: r.id, name: r.name, slug: r.slug, price: r.price, stock: r.availableOnRequest ? null : r.stock };
    const brand = r.brandName ?? "";
    if (ENGINEER_ONLY.test(`${r.name} ${typeof specs.type === "string" ? specs.type : ""}`)) continue;

    switch (r.categorySlug) {
      case "inverters":
        parts.inverters.push({ ...base, brand, continuousW: n("ratedContinuousW"), surgeW: n("surgeW"), systemVoltage: n("systemVoltage") });
        break;
      case "inverter-and-battery-sets":
        parts.sets.push({ ...base, brand, continuousW: n("ratedContinuousW"), surgeW: n("surgeW"), batteryWh: n("batteryKwh") * 1000 });
        break;
      case "lithium-batteries":
        parts.batteries.push({ ...base, brand, chemistry: "lithium", wh: n("capacityKwh") * 1000 || n("capacityAh") * n("voltage"), voltage: n("voltage") });
        break;
      // Drycell (gel/AGM) batteries are sized like tubular ones: both are lead-acid.
      case "tubular-batteries":
      case "drycell-batteries":
        parts.batteries.push({ ...base, brand, chemistry: "tubular", wh: n("capacityAh") * n("voltage"), voltage: n("voltage") });
        break;
      case "solar-panels":
        parts.panels.push({ ...base, watts: n("watts") });
        break;
    }
  }
  // A rating that turned out not to be a number would divide by zero in the builder.
  parts.batteries = parts.batteries.filter((b) => b.wh > 0);
  parts.panels = parts.panels.filter((p) => p.watts > 0);
  return parts;
}

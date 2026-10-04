import type { Chemistry, Needs, QuoteSettings } from "./types";

/**
 * Systems put together from single catalogue products, one brand at a time (owner decisions, 2026-10-03):
 * an inverter is only ever paired with its own brand's batteries, panels are counted with the cheapest
 * panel per watt, and cables, breakers and mounting are priced after a site visit, never guessed.
 * Unlike an approved package, nobody has checked these parts together, so every one is shown as
 * "an engineer confirms before installation".
 */

interface Part {
  id: string;
  name: string;
  slug: string;
  /** Naira, each. */
  price: number;
  /** Units in the shop; null when it is supplied on request. */
  stock: number | null;
}
export interface InverterPart extends Part {
  brand: string;
  continuousW: number;
  surgeW: number;
  systemVoltage: number;
}
export interface BatteryPart extends Part {
  brand: string;
  chemistry: Chemistry;
  /** Nominal capacity of one unit. */
  wh: number;
  voltage: number;
}
/** An inverter sold with its (lithium) battery: one all-in-one unit or a matched set. */
export interface SetPart extends Part {
  brand: string;
  continuousW: number;
  surgeW: number;
  batteryWh: number;
}
export interface PanelPart extends Part {
  watts: number;
}
export interface Parts {
  inverters: InverterPart[];
  batteries: BatteryPart[];
  sets: SetPart[];
  panels: PanelPart[];
}

export interface SystemLine {
  role: "set" | "inverter" | "battery" | "panel";
  name: string;
  slug: string;
  quantity: number;
  unitPriceNgn: number;
}

export interface SystemOption {
  id: string;
  brand: string;
  /** "set": inverter and battery sold together. "separate": an inverter with batteries bought alongside. */
  kind: "set" | "separate";
  chemistry: Chemistry;
  lines: SystemLine[];
  /** Equipment only: inverter, batteries and panels. Installation materials are priced after a site visit. */
  totalNgn: number;
  inverterContinuousW: number;
  batteryWh: number;
  /** Null when nothing was set to run on battery. */
  backupHours: number | null;
}

/** Battery strings wired side by side. More than this is a design job for an engineer. */
const MAX_PARALLEL = 4;

/** 12.8 V and 12 V are the same class. Null for anything else: high-voltage stacks go to an engineer. */
export function voltageClass(v: number): 12 | 24 | 48 | null {
  if (v >= 11 && v <= 15) return 12;
  if (v >= 22 && v <= 30) return 24;
  if (v >= 44 && v <= 60) return 48;
  return null;
}

export const tooLarge = (needs: Needs, s: QuoteSettings) => needs.inverterContinuousW > s.autoSizeLimitW;

const inStock = (p: Part, quantity: number) => p.stock == null || p.stock >= quantity;
const byPriceThenId = <T extends { price: number; id: string }>(a: T, b: T) => a.price - b.price || a.id.localeCompare(b.id);

/** The panel used for counting: cheapest per watt that the shop can supply enough of. */
export function pickPanel(panels: PanelPart[], arrayW: number): PanelPart | null {
  const usable = panels.filter((p) => p.watts > 0 && inStock(p, Math.ceil(arrayW / p.watts)));
  usable.sort((a, b) => a.price / a.watts - b.price / b.watts || a.id.localeCompare(b.id));
  return usable[0] ?? null;
}

/** How many of one battery model this inverter needs, or null when the two cannot be used together. */
function bank(b: BatteryPart, inv: InverterPart, needs: Needs): { quantity: number; wh: number } | null {
  const system = voltageClass(inv.systemVoltage);
  const unit = voltageClass(b.voltage);
  if (system == null || unit == null) return null;
  // Lithium packs must match the inverter's voltage; 12 V lead-acid blocks are wired in series to reach it.
  const series = b.chemistry === "lithium" ? (unit === system ? 1 : 0) : system / unit;
  if (series < 1 || !Number.isInteger(series)) return null;
  // At least one string even when nothing runs on backup: the inverter still needs a battery.
  const strings = Math.max(1, Math.ceil(needs.batteryWh[b.chemistry] / (b.wh * series)));
  if (strings > MAX_PARALLEL) return null;
  const quantity = strings * series;
  return inStock(b, quantity) ? { quantity, wh: quantity * b.wh } : null;
}

const fits = (p: { continuousW: number; surgeW: number }, needs: Needs) => p.continuousW >= needs.inverterContinuousW && p.surgeW >= needs.inverterSurgeW;

/**
 * Up to two systems per brand that cover the whole need: its cheapest fitting set, and its cheapest
 * inverter-plus-batteries pairing. Cheapest first. Empty when the load is above the site-visit limit.
 */
export function buildSystems(needs: Needs, parts: Parts, s: QuoteSettings, chemistry?: Chemistry): SystemOption[] {
  if (tooLarge(needs, s)) return [];

  const panel = pickPanel(parts.panels, needs.arrayW);
  const panelLines: SystemLine[] = panel
    ? [{ role: "panel", name: panel.name, slug: panel.slug, quantity: Math.ceil(needs.arrayW / panel.watts), unitPriceNgn: panel.price }]
    : [];

  const finish = (o: Omit<SystemOption, "totalNgn" | "backupHours">): SystemOption => {
    const lines = [...o.lines, ...panelLines];
    return {
      ...o,
      lines,
      totalNgn: lines.reduce((sum, l) => sum + l.unitPriceNgn * l.quantity, 0),
      backupHours: needs.backupLoadW > 0 ? (o.batteryWh * s.depthOfDischarge[o.chemistry] * s.inverterEfficiency) / needs.backupLoadW : null,
    };
  };

  const brands = new Set([...parts.inverters, ...parts.sets].map((p) => p.brand));
  const options: SystemOption[] = [];

  for (const brand of brands) {
    // Sets hold lithium batteries, so they are left out when the customer asked for tubular.
    const set =
      chemistry === "tubular"
        ? undefined
        : parts.sets
            .filter((p) => p.brand === brand && inStock(p, 1) && fits(p, needs) && p.batteryWh >= needs.batteryWh.lithium)
            .sort(byPriceThenId)[0];
    if (set) {
      options.push(
        finish({
          id: `${brand}:set`,
          brand,
          kind: "set",
          chemistry: "lithium",
          lines: [{ role: "set", name: set.name, slug: set.slug, quantity: 1, unitPriceNgn: set.price }],
          inverterContinuousW: set.continuousW,
          batteryWh: set.batteryWh,
        }),
      );
    }

    // Every fitting inverter with every battery model of the brand: keep the cheapest pairing.
    let best: { inv: InverterPart; battery: BatteryPart; quantity: number; wh: number; price: number; id: string } | undefined;
    for (const inv of parts.inverters) {
      if (inv.brand !== brand || !inStock(inv, 1) || !fits(inv, needs)) continue;
      for (const battery of parts.batteries) {
        if (battery.brand !== brand || (chemistry && battery.chemistry !== chemistry)) continue;
        const b = bank(battery, inv, needs);
        if (!b) continue;
        const candidate = { inv, battery, ...b, price: inv.price + battery.price * b.quantity, id: `${inv.id}:${battery.id}` };
        if (!best || byPriceThenId(candidate, best) < 0) best = candidate;
      }
    }
    if (best) {
      options.push(
        finish({
          id: `${brand}:separate`,
          brand,
          kind: "separate",
          chemistry: best.battery.chemistry,
          lines: [
            { role: "inverter", name: best.inv.name, slug: best.inv.slug, quantity: 1, unitPriceNgn: best.inv.price },
            { role: "battery", name: best.battery.name, slug: best.battery.slug, quantity: best.quantity, unitPriceNgn: best.battery.price },
          ],
          inverterContinuousW: best.inv.continuousW,
          batteryWh: best.wh,
        }),
      );
    }
  }

  return options.sort((a, b) => a.totalNgn - b.totalNgn || a.id.localeCompare(b.id));
}

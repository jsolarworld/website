import { hoursCovered } from "./engine";
import type { Chemistry, Needs, QuoteSettings } from "./types";

/**
 * Systems put together from single catalogue products, one brand at a time (owner decisions, 2026-10-03):
 * an inverter is only ever paired with its own brand's batteries, panels are counted with the cheapest
 * panel per watt (enough for the home and to refill the system's own battery), and cables, breakers and
 * mounting are priced after a site visit, never guessed.
 * Unlike an approved package, nobody has checked these parts together, so every one is shown as
 * "an engineer confirms before installation".
 * A product with no price yet still takes part (decided 2026-10-11): it is listed as "price on request"
 * and left out of the total.
 */

interface Part {
  id: string;
  name: string;
  slug: string;
  /** Naira, each. Null when the product has no price yet. */
  price: number | null;
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
  /** Null when the product has no price yet. */
  unitPriceNgn: number | null;
}

export interface SystemOption {
  id: string;
  brand: string;
  /** "set": inverter and battery sold together. "separate": an inverter with batteries bought alongside. */
  kind: "set" | "separate";
  chemistry: Chemistry;
  lines: SystemLine[];
  /**
   * Equipment only: inverter, batteries and panels, counting the lines that have a price (see `fullyPriced`).
   * Installation materials are priced after a site visit.
   */
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

/** False when a line has no price yet, so the total is only part of the cost. */
export const fullyPriced = (o: { lines: { unitPriceNgn: number | null }[] }) => o.lines.every((l) => l.unitPriceNgn != null);

const inStock = (p: Part, quantity: number) => p.stock == null || p.stock >= quantity;
const hasPrice = <T extends { price: number | null }>(p: T): p is T & { price: number } => p.price != null;
const byPriceThenId = <T extends { price: number; id: string }>(a: T, b: T) => a.price - b.price || a.id.localeCompare(b.id);

/**
 * The cheapest, among the choices that are priced in full, so the customer sees a total whenever the
 * brand can give one. Only when none is priced in full, the closest fit among the rest: the smallest
 * battery, then the smallest inverter.
 */
function choose<T extends { price: number | null; wh: number; continuousW: number; id: string }>(list: T[]): T | undefined {
  const priced = list.filter(hasPrice).sort(byPriceThenId)[0];
  return priced ?? [...list].sort((a, b) => a.wh - b.wh || a.continuousW - b.continuousW || a.id.localeCompare(b.id))[0];
}

/**
 * The panel used for counting: cheapest per watt that the shop can supply enough of. When no panel
 * has a price, the biggest one, so there are fewest to mount.
 */
export function pickPanel(panels: PanelPart[], arrayW: number): PanelPart | null {
  const usable = panels.filter((p) => p.watts > 0 && inStock(p, Math.ceil(arrayW / p.watts)));
  const priced = usable.filter(hasPrice).sort((a, b) => a.price / a.watts - b.price / b.watts || a.id.localeCompare(b.id));
  return priced[0] ?? usable.sort((a, b) => b.watts - a.watts || a.id.localeCompare(b.id))[0] ?? null;
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
 * inverter-plus-batteries pairing (see `choose` for parts with no price). Fully priced systems come
 * first, cheapest first. Empty when the load is above the site-visit limit.
 */
export function buildSystems(needs: Needs, parts: Parts, s: QuoteSettings, chemistry?: Chemistry): SystemOption[] {
  if (tooLarge(needs, s)) return [];

  const finish = (o: Omit<SystemOption, "totalNgn" | "backupHours">): SystemOption => {
    // A battery bigger than the home's need gets more panels than the home's need, so it still refills in about a day.
    const arrayW = Math.max(needs.arrayW, o.batteryWh * s.panelWPerBatteryWh);
    const panel = pickPanel(parts.panels, arrayW);
    const panelLines: SystemLine[] = panel
      ? [{ role: "panel", name: panel.name, slug: panel.slug, quantity: Math.ceil(arrayW / panel.watts), unitPriceNgn: panel.price }]
      : [];

    const lines = [...o.lines, ...panelLines];
    return {
      ...o,
      lines,
      totalNgn: lines.reduce((sum, l) => sum + (l.unitPriceNgn ?? 0) * l.quantity, 0),
      backupHours: hoursCovered(o.batteryWh, o.chemistry, needs.backupDraws, s),
    };
  };

  const brands = new Set([...parts.inverters, ...parts.sets].map((p) => p.brand));
  const options: SystemOption[] = [];

  for (const brand of brands) {
    // Sets hold lithium batteries, so they are left out when the customer asked for tubular.
    const set =
      chemistry === "tubular"
        ? undefined
        : choose(
            parts.sets
              .filter((p) => p.brand === brand && inStock(p, 1) && fits(p, needs) && p.batteryWh >= needs.batteryWh.lithium)
              .map((p) => ({ ...p, wh: p.batteryWh })),
          );
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
    const pairings: { inv: InverterPart; battery: BatteryPart; quantity: number; wh: number; price: number | null; continuousW: number; id: string }[] = [];
    for (const inv of parts.inverters) {
      if (inv.brand !== brand || !inStock(inv, 1) || !fits(inv, needs)) continue;
      for (const battery of parts.batteries) {
        if (battery.brand !== brand || (chemistry && battery.chemistry !== chemistry)) continue;
        const b = bank(battery, inv, needs);
        if (!b) continue;
        const price = hasPrice(inv) && hasPrice(battery) ? inv.price + battery.price * b.quantity : null;
        pairings.push({ inv, battery, ...b, price, continuousW: inv.continuousW, id: `${inv.id}:${battery.id}` });
      }
    }
    const best = choose(pairings);
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

  // A system waiting for a price has no total to compare, so those follow the priced ones, by brand.
  const rank = (o: SystemOption) => (fullyPriced(o) ? 0 : 1);
  return options.sort((a, b) => rank(a) - rank(b) || (rank(a) === 0 ? a.totalNgn - b.totalNgn : 0) || a.id.localeCompare(b.id));
}

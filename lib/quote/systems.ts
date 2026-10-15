import { backupDcWh, batteryLasts, batteryNameplateWh, defaultProfile, pvNeededW, type InverterProfile } from "./engine";
import type { Chemistry, Needs, QuoteSettings } from "./types";

/**
 * Systems put together from single catalogue products, one brand at a time (owner decisions, 2026-10-03):
 * an inverter is only ever paired with its own brand's batteries, and installation is priced after a site
 * visit, never guessed. Since 2026-10-14 each system is sized for its own inverter (stage 2 of the sizing
 * spec): its efficiency and no-load draw set the battery and the panels, the panels follow daily use (not
 * the size of the battery) and are wired up within the inverter's limits, and the spec's current checks
 * apply. A check runs only when the datasheet figures it needs are entered; until then an engineer
 * confirms it, as every card already says.
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

/** An inverter's solar input limits from its datasheet. Each is null until entered; a check missing a figure is skipped. */
export interface PvLimits {
  maxW: number | null;
  /** The highest open-circuit voltage the solar input takes. Going over it destroys the inverter. */
  maxVoc: number | null;
  mpptMinV: number | null;
  mpptMaxV: number | null;
  /** How many MPPT inputs it has. */
  mpptCount: number | null;
  /** Short-circuit current one MPPT input takes. */
  maxIscA: number | null;
}

/** Datasheet figures beyond an inverter's ratings. Missing or null until staff enter them. */
interface InverterDatasheet {
  /** 0 to 1. */
  efficiency?: number | null;
  /** No-load draw, watts. */
  idleW?: number | null;
  pv?: PvLimits;
  /** The most current it charges the battery with. */
  maxChargeA?: number | null;
}

export interface InverterPart extends Part, InverterDatasheet {
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
  maxChargeA?: number | null;
  maxDischargeA?: number | null;
  /** The most that can be joined in parallel, from the datasheet. */
  maxParallel?: number | null;
}
/** An inverter sold with its (lithium) battery: one all-in-one unit or a matched set. */
export interface SetPart extends Part, InverterDatasheet {
  brand: string;
  continuousW: number;
  surgeW: number;
  batteryWh: number;
  /** The battery's nominal voltage, for the charge check; 0 or missing when not entered. */
  systemVoltage?: number;
}
export interface PanelPart extends Part {
  watts: number;
  voc?: number | null;
  vmp?: number | null;
  isc?: number | null;
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
   * Accessories and installation are not included.
   */
  totalNgn: number;
  inverterContinuousW: number;
  batteryWh: number;
  /** Hours the battery carries the backup load: exactly the hours asked for when at its target. Null when nothing runs then. */
  backupHours: number | null;
  // The five below are missing on quotes saved before 2026-10-15.
  /** With more than a whole day's use stored: days of normal use. */
  backupDays?: number | null;
  /** The battery falls short of the target: a set's fixed battery, or the most of a model that can be joined. */
  short?: boolean;
  /** The inverter is more than 2.5 times what the home needs: shown with room to add more later. */
  oversized?: boolean;
  /** The charge current the datasheets allow cannot put the night's energy back in one day of sun. */
  slowRefill?: boolean;
  /** How the panels wire up, when the datasheets let it be checked. Null when an engineer works it out. */
  layout?: { strings: number; perString: number } | null;
}

/** Battery strings wired side by side when the battery's datasheet gives no limit. More is a design job for an engineer. */
const MAX_PARALLEL = 4;
/** A brand's systems stay within twice its smallest inverter that fits, so a 30 kVA set is not offered beside a 6 kVA one. */
const SIZE_CAP = 2;
/** More than this times the home's need is marked as bigger than needed. */
const OVERSIZED = 2.5;

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

/** An inverter's own losses, taking the settings' defaults for what its datasheet leaves out. */
const profileOf = (p: InverterDatasheet, s: QuoteSettings): InverterProfile => ({
  efficiency: p.efficiency ?? defaultProfile(s).efficiency,
  idleW: p.idleW ?? defaultProfile(s).idleW,
});

/** Panels in order of preference: cheapest per watt among the priced ones, then the biggest of the rest, so there are fewest to mount. */
function panelOrder(panels: PanelPart[]): PanelPart[] {
  const usable = panels.filter((p) => p.watts > 0);
  const priced = usable.filter(hasPrice).sort((a, b) => a.price / a.watts - b.price / b.watts || a.id.localeCompare(b.id));
  const open = usable.filter((p) => p.price == null).sort((a, b) => b.watts - a.watts || a.id.localeCompare(b.id));
  return [...priced, ...open];
}

/** The panel the home's own need is counted with: the first in order of preference that the shop can supply enough of. */
export function pickPanel(panels: PanelPart[], arrayW: number): PanelPart | null {
  return panelOrder(panels).find((p) => inStock(p, Math.ceil(arrayW / p.watts))) ?? null;
}

export interface PanelLayout {
  total: number;
  /** Null when the datasheets give nothing to check the wiring with. */
  strings: number | null;
  perString: number | null;
  /** Every wiring check had its figures. */
  checked: boolean;
}

const NO_LIMITS: PvLimits = { maxW: null, maxVoc: null, mpptMinV: null, mpptMaxV: null, mpptCount: null, maxIscA: null };

/**
 * The smallest number of panels, at least `minPanels`, that wires up on this inverter (sizing spec 3.3):
 * equal strings in series, the cold-morning voltage under the inverter's limit (going over it destroys the
 * inverter), the hot working voltage inside the MPPT range, no more strings on an input than its current
 * allows, and the total within the solar input power. A check whose figures are missing is skipped
 * (decided 2026-10-14) and `checked` says whether every one ran. Null when no layout passes.
 */
export function layoutPanels(minPanels: number, p: PanelPart, pv: PvLimits | undefined, s: QuoteSettings): PanelLayout | null {
  const lim = pv ?? NO_LIMITS;
  const { voc = null, vmp = null, isc = null } = p;
  const has = {
    voc: voc != null && lim.maxVoc != null,
    mpptMin: vmp != null && lim.mpptMinV != null,
    mpptMax: vmp != null && lim.mpptMaxV != null,
    current: isc != null && lim.maxIscA != null,
    power: lim.maxW != null,
  };
  const checked = Object.values(has).every(Boolean);
  const maxPanels = has.power ? Math.floor(lim.maxW! / p.watts) : Infinity;
  if (minPanels > maxPanels) return null;
  if (!has.voc && !has.mpptMin && !has.mpptMax && !has.current) return { total: minPanels, strings: null, perString: null, checked: false };

  const inputs = lim.mpptCount ?? 1;
  const stringsPerInput = has.current ? Math.floor(lim.maxIscA! / isc!) : Infinity;
  // One panel already gives more current than an input takes.
  if (stringsPerInput < 1) return null;
  const upTo = Math.min(maxPanels, minPanels * 2 + 8);
  for (let total = minPanels; total <= upTo; total++) {
    for (let strings = 1; strings <= total; strings++) {
      if (Math.ceil(strings / inputs) > stringsPerInput) break;
      if (total % strings !== 0) continue;
      const n = total / strings;
      if (has.voc && n * voc! * s.vocColdFactor > lim.maxVoc!) continue;
      if (has.mpptMin && n * vmp! * s.vmpHotFactor < lim.mpptMinV!) continue;
      if (has.mpptMax && n * vmp! > lim.mpptMaxV!) continue;
      return { total, strings, perString: n, checked };
    }
  }
  return null;
}

interface Bank {
  quantity: number;
  strings: number;
  wh: number;
  short: boolean;
}

/**
 * How many of one battery model reach `targetWh` on an inverter of `systemVoltage`, or null when the two
 * cannot be used together. Lithium packs must match the inverter's voltage; 12 V lead-acid blocks are wired
 * in series to reach it. With the battery's own parallel limit entered, the bank stops there and is marked
 * short (sizing spec); without it, more than four strings is left to an engineer.
 */
function bank(b: BatteryPart, systemVoltage: number, targetWh: number): Bank | null {
  const system = voltageClass(systemVoltage);
  const unit = voltageClass(b.voltage);
  if (system == null || unit == null) return null;
  const series = b.chemistry === "lithium" ? (unit === system ? 1 : 0) : system / unit;
  if (series < 1 || !Number.isInteger(series)) return null;
  // At least one string even when nothing runs at night: the inverter still needs a battery.
  const wanted = Math.max(1, Math.ceil(targetWh / (b.wh * series)));
  if (b.maxParallel == null && wanted > MAX_PARALLEL) return null;
  const strings = Math.min(wanted, b.maxParallel ?? MAX_PARALLEL);
  const quantity = strings * series;
  return inStock(b, quantity) ? { quantity, strings, wh: quantity * b.wh, short: wanted > strings } : null;
}

/** The smaller of the charge currents that are known; null when neither is. */
const lowestKnown = (...amps: (number | null | undefined)[]) => {
  const known = amps.filter((a): a is number => a != null);
  return known.length ? Math.min(...known) : null;
};

interface Sizing {
  /** What the system's battery and inverter set, before the panels are added. */
  base: Omit<SystemOption, "totalNgn" | "backupHours" | "backupDays" | "short" | "oversized" | "slowRefill" | "layout">;
  inverter: InverterDatasheet;
  short: boolean;
  /** Charge current the datasheets allow, and the battery's nominal voltage: both needed for the refill check. */
  chargeA: number | null;
  volts: 12 | 24 | 48 | null;
}

/**
 * Add the panels and finish the figures for one system. Null when no panel wires up on the inverter: that
 * pairing cannot be offered (sizing spec 3.3). Panels the shop has too few of are left out of the system.
 */
function finish(z: Sizing, needs: Needs, panels: PanelPart[], s: QuoteSettings): SystemOption | null {
  const profile = profileOf(z.inverter, s);
  const pvW = pvNeededW(needs, profile, z.base.chemistry, s);

  let panelLine: SystemLine | null = null;
  let layout: SystemOption["layout"] = null;
  let wiresUp = panels.length === 0;
  for (const panel of panelOrder(panels)) {
    const fit = layoutPanels(Math.max(1, Math.ceil(pvW / panel.watts)), panel, z.inverter.pv, s);
    if (!fit) continue;
    wiresUp = true;
    if (!inStock(panel, fit.total)) continue;
    panelLine = { role: "panel", name: panel.name, slug: panel.slug, quantity: fit.total, unitPriceNgn: panel.price };
    layout = fit.strings != null && fit.perString != null ? { strings: fit.strings, perString: fit.perString } : null;
    break;
  }
  if (!wiresUp) return null;

  const lines = [...z.base.lines, ...(panelLine ? [panelLine] : [])];
  const lasts = batteryLasts(z.base.batteryWh, z.base.chemistry, needs, profile, s);
  const refill = z.chargeA != null && z.volts != null ? z.chargeA * z.volts * needs.peakSunHours : null;
  return {
    ...z.base,
    lines,
    totalNgn: lines.reduce((sum, l) => sum + (l.unitPriceNgn ?? 0) * l.quantity, 0),
    backupHours: lasts?.hours ?? null,
    backupDays: lasts?.days ?? null,
    short: z.short,
    oversized: z.base.inverterContinuousW > OVERSIZED * needs.inverterContinuousW,
    slowRefill: refill != null && refill < backupDcWh(needs, profile) / s.roundTrip[z.base.chemistry],
    layout,
  };
}

/**
 * The one system to show from a brand's candidates of one kind: one whose battery reaches its target before
 * one that falls short, then the cheapest priced in full, so the customer sees a total whenever the brand can
 * give one; with nothing priced in full, the closest fit (the smallest battery, then the smallest inverter).
 */
function best(candidates: { option: SystemOption; key: string }[]): SystemOption | undefined {
  const order = (a: { option: SystemOption; key: string }, b: { option: SystemOption; key: string }) => {
    const [x, y] = [a.option, b.option];
    return (
      Number(x.short ?? false) - Number(y.short ?? false) ||
      Number(!fullyPriced(x)) - Number(!fullyPriced(y)) ||
      (fullyPriced(x) ? x.totalNgn - y.totalNgn : x.batteryWh - y.batteryWh || x.inverterContinuousW - y.inverterContinuousW) ||
      a.key.localeCompare(b.key)
    );
  };
  return [...candidates].sort(order)[0]?.option;
}

/**
 * Up to two systems per brand: its best set and its best inverter with batteries, both within twice the
 * brand's smallest inverter that fits (sizing spec 4). Fully priced systems that reach the battery target
 * come first, cheapest first, then those that fall short, then those waiting for a price. Empty when the
 * load is above the site-visit limit.
 */
export function buildSystems(needs: Needs, parts: Parts, s: QuoteSettings, chemistry?: Chemistry): SystemOption[] {
  if (tooLarge(needs, s)) return [];

  const fitsNeed = (p: Part & { continuousW: number; surgeW: number }) =>
    inStock(p, 1) && p.continuousW >= needs.inverterContinuousW && p.surgeW >= needs.inverterSurgeW;
  const brands = new Set([...parts.inverters, ...parts.sets].map((p) => p.brand));
  const options: SystemOption[] = [];

  for (const brand of brands) {
    const inverters = parts.inverters.filter((p) => p.brand === brand && fitsNeed(p));
    // Sets hold lithium batteries, so they are left out when the customer asked for tubular.
    const sets = chemistry === "tubular" ? [] : parts.sets.filter((p) => p.brand === brand && fitsNeed(p));
    const smallest = Math.min(...[...inverters, ...sets].map((p) => p.continuousW));
    if (!Number.isFinite(smallest)) continue;
    const withinCap = (p: { continuousW: number }) => p.continuousW <= SIZE_CAP * smallest;

    // A set's battery is fixed: one below the target is still shown, with the hours it really gives.
    const setCandidates = sets.filter(withinCap).flatMap((set) => {
      const target = batteryNameplateWh(needs, profileOf(set, s), "lithium", s);
      const option = finish(
        {
          base: {
            id: `${brand}:set`,
            brand,
            kind: "set",
            chemistry: "lithium",
            lines: [{ role: "set", name: set.name, slug: set.slug, quantity: 1, unitPriceNgn: set.price }],
            inverterContinuousW: set.continuousW,
            batteryWh: set.batteryWh,
          },
          inverter: set,
          short: set.batteryWh < target,
          chargeA: set.maxChargeA ?? null,
          volts: voltageClass(set.systemVoltage ?? 0),
        },
        needs,
        parts.panels,
        s,
      );
      return option ? [{ option, key: set.id }] : [];
    });

    // Every inverter that fits, with every battery model of the brand.
    const pairCandidates = inverters.filter(withinCap).flatMap((inv) => {
      const profile = profileOf(inv, s);
      const volts = voltageClass(inv.systemVoltage);
      return parts.batteries.flatMap((battery) => {
        if (battery.brand !== brand || (chemistry && battery.chemistry !== chemistry) || volts == null) return [];
        const b = bank(battery, inv.systemVoltage, batteryNameplateWh(needs, profile, battery.chemistry, s));
        if (!b) return [];
        // Everything at once, through the inverter, must be within the current the strings can give.
        if (battery.maxDischargeA != null && needs.peakW / profile.efficiency / volts > b.strings * battery.maxDischargeA) return [];
        const option = finish(
          {
            base: {
              id: `${brand}:separate`,
              brand,
              kind: "separate",
              chemistry: battery.chemistry,
              lines: [
                { role: "inverter", name: inv.name, slug: inv.slug, quantity: 1, unitPriceNgn: inv.price },
                { role: "battery", name: battery.name, slug: battery.slug, quantity: b.quantity, unitPriceNgn: battery.price },
              ],
              inverterContinuousW: inv.continuousW,
              batteryWh: b.wh,
            },
            inverter: inv,
            short: b.short,
            chargeA: lowestKnown(inv.maxChargeA, battery.maxChargeA != null ? b.strings * battery.maxChargeA : null),
            volts,
          },
          needs,
          parts.panels,
          s,
        );
        return option ? [{ option, key: `${inv.id}:${battery.id}` }] : [];
      });
    });

    for (const o of [best(setCandidates), best(pairCandidates)]) if (o) options.push(o);
  }

  // Priced in full and meeting the target first, then priced but short, then those waiting for a price.
  const rank = (o: SystemOption) => (fullyPriced(o) ? 0 : 2) + (o.short ? 1 : 0);
  return options.sort((a, b) => rank(a) - rank(b) || (fullyPriced(a) ? a.totalNgn - b.totalNgn : 0) || a.id.localeCompare(b.id));
}

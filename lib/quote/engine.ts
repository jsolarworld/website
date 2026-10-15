import type {
  Chemistry,
  Needs,
  PackageOption,
  QuoteInput,
  QuotePackage,
  QuoteResult,
  QuoteSettings,
  UsageTime,
} from "./types";

/**
 * Sizing (the sizing spec of 2026-10-14, replacing PRD 7.2's formulas, which this file followed until then)
 * works in two stages. `computeNeeds` works out the home's needs once from the appliance list: energy in a
 * day, energy in the backup window, and power drawn at once, all AC. The functions below it turn those into
 * a battery and solar watts for one inverter, using that inverter's efficiency and no-load draw. The page's
 * headline uses the default inverter; each system in systems.ts uses its own. Every figure on the page comes
 * from these functions, so the headline and the cards cannot contradict each other.
 */

const CHEMISTRIES: Chemistry[] = ["lithium", "tubular"];

/** Appliances the customer left off the system: they stay on mains or generator and are not sized for. */
export const leftOff = (input: QuoteInput) => [...new Set(input.items.filter((i) => !i.onBackup).map((i) => i.name))];

/**
 * How many of an appliance's hours fall inside a backup window of `backupHours` (B, at most 24). Used at
 * night, all of them, up to B. In the day, only those that spill over from the 24 − B hours of daylight or
 * grid. Both, spread evenly. So the backup energy is never more than the day's, and equals it when B is 24.
 */
export function hoursInBackup(hoursPerDay: number, usage: UsageTime, backupHours: number): number {
  const h = Math.min(hoursPerDay, 24);
  const b = Math.min(backupHours, 24);
  if (usage === "day") return Math.max(0, h - (24 - b));
  if (usage === "both") return (h * b) / 24;
  return Math.min(h, b);
}

/** An inverter's own losses: its efficiency, and the watts it draws with nothing switched on. */
export interface InverterProfile {
  efficiency: number;
  idleW: number;
}

/** The inverter the headline is worked out with, and the stand-in for figures a datasheet leaves out. */
export const defaultProfile = (s: QuoteSettings): InverterProfile => ({ efficiency: s.inverterEfficiency, idleW: s.inverterIdleW });

type Energy = Pick<Needs, "dailyWh" | "backupWh" | "backupHours" | "peakSunHours">;

/** What the battery gives over the backup window: the load through the inverter, plus the inverter idling all of it. */
export const backupDcWh = (n: Energy, p: InverterProfile) => n.backupWh / p.efficiency + p.idleW * n.backupHours;

/** A day's use as the battery and panels see it, idling included. */
export const dailyDcWh = (n: Energy, p: InverterProfile) => n.dailyWh / p.efficiency + p.idleW * 24;

/** Battery nameplate that carries the backup window without going below the chemistry's depth of discharge. */
export const batteryNameplateWh = (n: Energy, p: InverterProfile, chemistry: Chemistry, s: QuoteSettings) =>
  backupDcWh(n, p) / s.depthOfDischarge[chemistry];

/**
 * Solar watts that cover a day's use, plus what is lost putting the night's energy into the battery and
 * taking it out. It depends on use, not on the size of the battery.
 */
export const pvNeededW = (n: Energy, p: InverterProfile, chemistry: Chemistry, s: QuoteSettings) =>
  (dailyDcWh(n, p) + backupDcWh(n, p) * (1 / s.roundTrip[chemistry] - 1)) / (n.peakSunHours * s.pvDerate);

/**
 * How long a battery of `nameplateWh` carries the backup load: hours, which come to exactly B for a battery
 * at its target, and with more than a whole day's use stored, the number of days too. Null when nothing
 * on the list runs during the backup window.
 */
export function batteryLasts(
  nameplateWh: number,
  chemistry: Chemistry,
  n: Energy,
  p: InverterProfile,
  s: QuoteSettings,
): { hours: number; days: number | null } | null {
  if (n.backupWh <= 0) return null;
  const usable = nameplateWh * s.depthOfDischarge[chemistry];
  const hours = usable / (backupDcWh(n, p) / n.backupHours);
  const daily = dailyDcWh(n, p);
  return { hours, days: hours > 24 && usable >= daily ? usable / daily : null };
}

/**
 * Stage 1: what the home needs, from the appliances the system powers. A heavy appliance the customer leaves
 * unticked is left out of every figure (decided 2026-10-11). The battery and solar figures use the default
 * inverter, and `s.peakSunHours` is the customer's own (see sun.ts).
 */
export function computeNeeds(input: QuoteInput, s: QuoteSettings): Needs {
  let peakW = 0;
  let largestStartupExtraW = 0;
  let dailyWh = 0;
  let backupWh = 0;
  let highDrawOnBackup = false;

  for (const item of input.items) {
    if (!item.onBackup) continue;
    const averageW = item.watts * item.quantity * item.dutyCycle;
    peakW += item.watts * item.quantity;
    // One motor starts at a time, so take the largest single extra.
    largestStartupExtraW = Math.max(largestStartupExtraW, item.watts * (item.surge - 1));
    dailyWh += averageW * Math.min(item.hoursPerDay, 24);
    backupWh += averageW * hoursInBackup(item.hoursPerDay, item.usageTime ?? "night", input.backupHours);
    if (item.highDraw) highDrawOnBackup = true;
  }

  const energy: Energy = { dailyWh, backupWh, backupHours: input.backupHours, peakSunHours: s.peakSunHours };
  const profile = defaultProfile(s);
  const batteryWh = {} as Record<Chemistry, number>;
  const pvW = {} as Record<Chemistry, number>;
  for (const chem of CHEMISTRIES) {
    batteryWh[chem] = batteryNameplateWh(energy, profile, chem, s);
    pvW[chem] = pvNeededW(energy, profile, chem, s);
  }
  const surgeW = peakW + largestStartupExtraW;

  return {
    peakW,
    surgeW,
    dailyWh,
    backupWh,
    inverterContinuousW: peakW * s.inverterSafetyMargin,
    inverterSurgeW: surgeW,
    arrayW: pvW.lithium,
    pvW,
    batteryWh,
    highDrawOnBackup,
    backupHours: input.backupHours,
    peakSunHours: s.peakSunHours,
  };
}

/** How long a package's battery lasts, with the default inverter (packages carry no datasheet figures). */
function packageOption(pkg: QuotePackage, needs: Needs, s: QuoteSettings): PackageOption {
  const lasts = batteryLasts(pkg.batteryWh, pkg.chemistry, needs, defaultProfile(s), s);
  return { package: pkg, backupHours: lasts?.hours ?? null, backupDays: lasts?.days ?? null };
}

/** Hours a package's battery carries the backup load (see `batteryLasts`). */
export const backupHoursFor = (pkg: QuotePackage, needs: Needs, s: QuoteSettings): number | null => packageOption(pkg, needs, s).backupHours;

function meetsInverter(pkg: QuotePackage, needs: Needs): boolean {
  return (
    pkg.inverterContinuousW >= needs.inverterContinuousW &&
    pkg.inverterSurgeW >= needs.inverterSurgeW
  );
}

function meetsAll(pkg: QuotePackage, needs: Needs): boolean {
  return (
    meetsInverter(pkg, needs) &&
    pkg.batteryWh >= needs.batteryWh[pkg.chemistry] &&
    pkg.arrayW >= needs.pvW[pkg.chemistry]
  );
}

/** PRD 7.3: Recommended, Budget, More headroom, or Custom. */
export function matchPackages(
  needs: Needs,
  packages: QuotePackage[],
  s: QuoteSettings,
  chemistry?: Chemistry,
): QuoteResult {
  const pool = packages
    .filter((p) => p.approved && (!chemistry || p.chemistry === chemistry))
    .sort((a, b) => a.price - b.price || a.id.localeCompare(b.id));

  const option = (pkg: QuotePackage | undefined): PackageOption | null => (pkg ? packageOption(pkg, needs, s) : null);

  const fits = pool.filter((p) => meetsAll(p, needs));
  const recommended = fits[0];
  const headroom = recommended ? fits.find((p) => p.price > recommended.price) : undefined;

  // Budget: inverter must still fit, battery may fall short (but not below the floor).
  const budget = pool.find(
    (p) =>
      meetsInverter(p, needs) &&
      p.batteryWh >= needs.batteryWh[p.chemistry] * s.budgetBatteryFloor,
  );
  // Only worth showing when it is actually cheaper than the recommended package.
  const showBudget = budget && (!recommended || budget.price < recommended.price);

  const custom = !recommended;
  return {
    needs,
    recommended: option(recommended),
    budget: option(showBudget ? budget : undefined),
    headroom: option(headroom),
    custom,
    engineerReview: custom || needs.highDrawOnBackup,
  };
}

export function quote(
  input: QuoteInput,
  packages: QuotePackage[],
  s: QuoteSettings,
  chemistry?: Chemistry,
): QuoteResult {
  return matchPackages(computeNeeds(input, s), packages, s, chemistry);
}

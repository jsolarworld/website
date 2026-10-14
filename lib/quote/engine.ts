import type {
  BackupDraw,
  Chemistry,
  Needs,
  PackageOption,
  QuoteInput,
  QuotePackage,
  QuoteResult,
  QuoteSettings,
} from "./types";

const CHEMISTRIES: Chemistry[] = ["lithium", "tubular"];

/** Appliances the customer left off the system: they stay on mains or generator and are not sized for. */
export const leftOff = (input: QuoteInput) => [...new Set(input.items.filter((i) => !i.onBackup).map((i) => i.name))];

/**
 * Wh the battery has to give over an outage of `hours`. Decided 2026-10-14, after customers found the
 * battery, and so the quote, too high: each appliance counts for its own hours a day, never longer than
 * the outage. PRD 7.2 counted every appliance for the whole outage, so a TV watched 5 hours a day was
 * sized as if it ran for all 12. The diversity factor still applies.
 */
export function outageWh(draws: BackupDraw[], hours: number, s: QuoteSettings): number {
  return s.diversityFactor * draws.reduce((sum, d) => sum + d.w * Math.min(d.hoursPerDay, hours), 0);
}

/**
 * How many hours of outage a battery covers, by the same rule as `outageWh`. 24 means a whole day: every
 * appliance has had its full day's use. Null when nothing runs on battery.
 */
export function hoursCovered(batteryWh: number, chemistry: Chemistry, draws: BackupDraw[], s: QuoteSettings): number | null {
  const running = draws.filter((d) => d.w > 0 && d.hoursPerDay > 0);
  if (running.length === 0) return null;
  const usable = batteryWh * s.depthOfDischarge[chemistry] * s.inverterEfficiency;
  // The energy used climbs in straight lines between the hours at which appliances are done for the day.
  const stops = [...new Set([0, ...running.map((d) => Math.min(d.hoursPerDay, 24)), 24])].sort((a, b) => a - b);
  for (let k = 1; k < stops.length; k++) {
    const from = stops[k - 1];
    const used = outageWh(running, from, s);
    const perHour = s.diversityFactor * running.filter((d) => d.hoursPerDay > from).reduce((sum, d) => sum + d.w, 0);
    if (used + perHour * (stops[k] - from) >= usable) return perHour > 0 ? from + (usable - used) / perHour : from;
  }
  return 24;
}

/**
 * PRD 7.2: what the home needs, before looking at any package. Since 2026-10-11 a heavy appliance the
 * customer leaves unticked is left out of every figure, not only the battery: counting cookers, heaters
 * and pumps towards the inverter made an ordinary household list need more than anything in the shop.
 */
export function computeNeeds(input: QuoteInput, s: QuoteSettings): Needs {
  let peakW = 0;
  let largestStartupExtraW = 0;
  let dailyWh = 0;
  let backupSumW = 0;
  let highDrawOnBackup = false;
  const backupDraws: BackupDraw[] = [];

  for (const item of input.items) {
    if (!item.onBackup) continue;
    const load = item.watts * item.quantity;
    peakW += load;
    // Only one motor is assumed to start at a time, so take the largest single extra.
    largestStartupExtraW = Math.max(largestStartupExtraW, item.watts * (item.surge - 1));
    dailyWh += load * item.hoursPerDay * item.dutyCycle;
    backupSumW += load * item.dutyCycle;
    backupDraws.push({ w: load * item.dutyCycle, hoursPerDay: item.hoursPerDay });
    if (item.highDraw) highDrawOnBackup = true;
  }

  const backupLoadW = backupSumW * s.diversityFactor;
  const surgeW = peakW + largestStartupExtraW;

  const batteryWh = {} as Record<Chemistry, number>;
  for (const chem of CHEMISTRIES) {
    batteryWh[chem] = outageWh(backupDraws, input.backupHours, s) / (s.depthOfDischarge[chem] * s.inverterEfficiency);
  }

  return {
    peakW,
    surgeW,
    dailyWh,
    backupLoadW,
    backupDraws,
    inverterContinuousW: peakW * s.inverterSafetyMargin,
    inverterSurgeW: surgeW,
    // PRD 7.2 sizes the array for a day's energy. Since 2026-10-11 it must also carry everything running
    // at once in full sun, so daytime use does not drain the battery. Engineers confirm both.
    arrayW: Math.max(dailyWh / s.peakSunHours, peakW) / s.systemDerate,
    batteryWh,
    highDrawOnBackup,
  };
}

/** Hours of outage a package's battery covers (see `hoursCovered`). */
export const backupHoursFor = (pkg: QuotePackage, needs: Needs, s: QuoteSettings): number | null =>
  hoursCovered(pkg.batteryWh, pkg.chemistry, needs.backupDraws, s);

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
    pkg.arrayW >= needs.arrayW
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

  const option = (pkg: QuotePackage | undefined): PackageOption | null =>
    pkg ? { package: pkg, backupHours: backupHoursFor(pkg, needs, s) } : null;

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

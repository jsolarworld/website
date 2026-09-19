import type {
  Chemistry,
  Needs,
  PackageOption,
  QuoteInput,
  QuotePackage,
  QuoteResult,
  QuoteSettings,
} from "./types";

const CHEMISTRIES: Chemistry[] = ["lithium", "tubular"];

/** PRD 7.2: what the home needs, before looking at any package. */
export function computeNeeds(input: QuoteInput, s: QuoteSettings): Needs {
  let peakW = 0;
  let largestStartupExtraW = 0;
  let dailyWh = 0;
  let backupSumW = 0;
  let highDrawOnBackup = false;

  for (const item of input.items) {
    const load = item.watts * item.quantity;
    peakW += load;
    // Only one motor is assumed to start at a time, so take the largest single extra.
    largestStartupExtraW = Math.max(largestStartupExtraW, item.watts * (item.surge - 1));
    dailyWh += load * item.hoursPerDay * item.dutyCycle;
    if (item.onBackup) {
      backupSumW += load * item.dutyCycle;
      if (item.highDraw) highDrawOnBackup = true;
    }
  }

  const backupLoadW = backupSumW * s.diversityFactor;
  const surgeW = peakW + largestStartupExtraW;

  const batteryWh = {} as Record<Chemistry, number>;
  for (const chem of CHEMISTRIES) {
    batteryWh[chem] =
      (backupLoadW * input.backupHours) / (s.depthOfDischarge[chem] * s.inverterEfficiency);
  }

  return {
    peakW,
    surgeW,
    dailyWh,
    backupLoadW,
    inverterContinuousW: peakW * s.inverterSafetyMargin,
    inverterSurgeW: surgeW,
    arrayW: dailyWh / (s.peakSunHours * s.systemDerate),
    batteryWh,
    highDrawOnBackup,
  };
}

/** Hours a package can carry the backup load. */
export function backupHoursFor(pkg: QuotePackage, needs: Needs, s: QuoteSettings): number | null {
  if (needs.backupLoadW <= 0) return null;
  return (
    (pkg.batteryWh * s.depthOfDischarge[pkg.chemistry] * s.inverterEfficiency) /
    needs.backupLoadW
  );
}

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

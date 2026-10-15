import type { AccessoryLine } from "./accessories";
import type { SystemOption } from "./systems";
import type { Needs, PackageOption, QuoteResult } from "./types";

/** Extra catalogue info the engine doesn't need but the results page does. */
export interface PackageMeta {
  slug: string;
  components: { name: string; slug: string; quantity: number }[];
}

export type OptionLabel = "Recommended" | "Budget" | "More headroom";

export interface OptionView {
  label: OptionLabel;
  packageId: string;
  slug: string;
  name: string;
  priceNgn: number;
  chemistry: "lithium" | "tubular";
  /** Null when nothing was set to run on battery. */
  backupHours: number | null;
  /** With more than a whole day's use stored: days of normal use. Missing on quotes saved before 2026-10-15. */
  backupDays?: number | null;
  inverterContinuousW: number;
  batteryWh: number;
  arrayW: number;
  components: PackageMeta["components"];
  /** True when the customer gave a budget and this option is above it. */
  overBudget: boolean;
}

export interface SystemView extends SystemOption {
  /** True when the customer gave a budget and this system is above it. */
  overBudget: boolean;
}

/** What was put together from single catalogue products, next to the approved packages. */
export interface BrandSystems {
  systems: SystemOption[];
  /** The load is above the size quoted without a site visit, so no products are offered. */
  tooLarge: boolean;
  /** The panel the systems are counted with (cheapest per watt), if any panel is priced. */
  panel: { name: string; slug: string; watts: number } | null;
}

/** JSON-safe snapshot of a quote result: what the customer sees, and what is stored on save. */
export interface QuoteView {
  needs: Needs;
  backupHours: number;
  options: OptionView[];
  /** No approved package fits. */
  custom: boolean;
  engineerReview: boolean;
  // The three below are missing on quotes saved before brand systems existed.
  /** One or two systems per brand, cheapest first. An engineer confirms them before installation. */
  systems?: SystemView[];
  tooLarge?: boolean;
  panel?: BrandSystems["panel"];
  /**
   * Heavy appliances the customer left off the system: nothing above is sized for them. Missing on quotes
   * saved before 2026-10-11, when such appliances still counted towards the inverter and the panels.
   */
  leftOff?: string[];
  /** The usual extras, outside every total (see `pickAccessories`). Missing on quotes saved before 2026-10-14. */
  accessories?: AccessoryLine[];
}

const NO_SYSTEMS: BrandSystems = { systems: [], tooLarge: false, panel: null };

/**
 * How long a battery lasts, in words (sizing spec 5): "about 9.5 hours of backup", and with more than a
 * whole day's use stored "about 3.7 days of your normal use". Given the hours asked for, a battery that
 * falls short says so. Quotes saved before 2026-10-15 carry no days, so there 24 hours or more stays in hours.
 */
export function backupPhrase(hours: number, days?: number | null, askedHours?: number): string {
  if (days != null) return `about ${days.toFixed(1)} days of your normal use`;
  if (hours >= 24) return "more than 24 hours of backup";
  // A battery at its target gives exactly the hours asked for; the margin keeps rounding from calling it short.
  const short = askedHours != null && hours < askedHours - 0.05;
  return `about ${hours.toFixed(1)} hours of backup${short ? `, short of your ${askedHours} hours` : ""}`;
}
/** `backupPhrase` at the start of a sentence. */
export const backupSentence = (...args: Parameters<typeof backupPhrase>) => {
  const phrase = backupPhrase(...args);
  return phrase[0].toUpperCase() + phrase.slice(1);
};

/** The inverter a home needs, rounded up to the next half kilowatt (sizing spec 5): 2,407 W is "2.5". */
export const inverterKw = (w: number) => (Math.ceil(w / 500) / 2).toFixed(1);
/** Solar watts in kilowatts to one decimal: 4,207 W is "4.2". */
export const solarKw = (w: number) => (w / 1000).toFixed(1);

export function buildView(
  result: QuoteResult,
  backupHours: number,
  meta: Map<string, PackageMeta>,
  budgetNgn?: number,
  brand: BrandSystems = NO_SYSTEMS,
): QuoteView {
  const over = (price: number) => budgetNgn != null && budgetNgn > 0 && price > budgetNgn;
  const toView = (label: OptionLabel, o: PackageOption | null): OptionView[] => {
    if (!o) return [];
    const m = meta.get(o.package.id);
    return [
      {
        label,
        packageId: o.package.id,
        slug: m?.slug ?? "",
        name: o.package.name,
        priceNgn: o.package.price,
        chemistry: o.package.chemistry,
        backupHours: o.backupHours,
        backupDays: o.backupDays,
        inverterContinuousW: o.package.inverterContinuousW,
        batteryWh: o.package.batteryWh,
        arrayW: o.package.arrayW,
        components: m?.components ?? [],
        overBudget: over(o.package.price),
      },
    ];
  };

  return {
    needs: result.needs,
    backupHours,
    options: [
      ...toView("Recommended", result.recommended),
      ...toView("Budget", result.budget),
      ...toView("More headroom", result.headroom),
    ],
    custom: result.custom,
    engineerReview: result.engineerReview,
    systems: brand.systems.map((o) => ({ ...o, overBudget: over(o.totalNgn) })),
    tooLarge: brand.tooLarge,
    panel: brand.panel,
  };
}

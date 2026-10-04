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
}

const NO_SYSTEMS: BrandSystems = { systems: [], tooLarge: false, panel: null };

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

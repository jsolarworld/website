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

/** JSON-safe snapshot of a quote result: what the customer sees, and what is stored on save. */
export interface QuoteView {
  needs: Needs;
  backupHours: number;
  options: OptionView[];
  /** No package fits: show the needs and route to a site inspection. */
  custom: boolean;
  engineerReview: boolean;
}

export function buildView(
  result: QuoteResult,
  backupHours: number,
  meta: Map<string, PackageMeta>,
  budgetNgn?: number,
): QuoteView {
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
        overBudget: budgetNgn != null && budgetNgn > 0 && o.package.price > budgetNgn,
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
  };
}

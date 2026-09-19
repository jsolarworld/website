export type Chemistry = "lithium" | "tubular";

export interface Appliance {
  id: string;
  name: string;
  category: "lighting" | "cooling" | "entertainment" | "kitchen" | "work" | "water" | "security";
  watts: number;
  /** Share of time a cycling load actually runs (fridges 0.4). */
  dutyCycle: number;
  /** Start-up draw multiplier for motor loads. */
  surge: number;
  /** Heavy heating loads that should usually stay off battery backup. */
  highDraw: boolean;
}

/** One line of the customer's appliance list. */
export interface QuoteItem {
  name: string;
  watts: number;
  quantity: number;
  hoursPerDay: number;
  dutyCycle: number;
  surge: number;
  highDraw: boolean;
  /** Whether this item must run from the battery during an outage. */
  onBackup: boolean;
}

export interface QuoteInput {
  items: QuoteItem[];
  backupHours: number;
}

/** Admin-editable sizing assumptions (PRD 7.1). */
export interface QuoteSettings {
  peakSunHours: number;
  systemDerate: number;
  inverterEfficiency: number;
  inverterSafetyMargin: number;
  depthOfDischarge: Record<Chemistry, number>;
  diversityFactor: number;
  /** Budget option must carry at least this share of the battery need. */
  budgetBatteryFloor: number;
  quoteValidityDays: number;
}

export interface Needs {
  peakW: number;
  surgeW: number;
  dailyWh: number;
  backupLoadW: number;
  inverterContinuousW: number;
  inverterSurgeW: number;
  arrayW: number;
  /** Nominal battery capacity needed, per chemistry. */
  batteryWh: Record<Chemistry, number>;
  /** True when a high-draw item is set to run on battery backup. */
  highDrawOnBackup: boolean;
}

/** An engineer-approved bundle. The engine only picks among these. */
export interface QuotePackage {
  id: string;
  name: string;
  /** Naira. */
  price: number;
  chemistry: Chemistry;
  inverterContinuousW: number;
  inverterSurgeW: number;
  /** Nominal battery capacity. */
  batteryWh: number;
  arrayW: number;
  approved: boolean;
}

export interface PackageOption {
  package: QuotePackage;
  /** Hours the package can carry the backup load; null when nothing is on backup. */
  backupHours: number | null;
}

export interface QuoteResult {
  needs: Needs;
  recommended: PackageOption | null;
  budget: PackageOption | null;
  headroom: PackageOption | null;
  /** No package fits: show the needs and route to a site inspection. */
  custom: boolean;
  /** Flag the lead for engineer review (PRD 7.3). */
  engineerReview: boolean;
}

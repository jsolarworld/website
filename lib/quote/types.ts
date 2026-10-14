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
  /** Heavy loads (heaters, cookers, big pumps) that start off the solar system: see `QuoteItem.onBackup`. */
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
  /**
   * Whether the system powers this item, battery included. False only for a heavy appliance the customer
   * left unticked: it stays on mains or generator and no figure is sized for it.
   */
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
  /** Above this inverter need (continuous watts) no products are offered: the customer is sent to a site visit. */
  autoSizeLimitW: number;
  /** A system put together from single products gets at least this many panel watts per Wh of its own battery. */
  panelWPerBatteryWh: number;
  /** Watts per VA an inverter is counted at when the catalogue has its kVA figure but not its rated watts. */
  inverterPowerFactor: number;
}

/** What one appliance on the system asks of the battery. */
export interface BackupDraw {
  /** Average draw: watts × quantity × duty cycle. */
  w: number;
  hoursPerDay: number;
}

export interface Needs {
  peakW: number;
  surgeW: number;
  dailyWh: number;
  /** Average draw of everything on the system together, after diversity. Zero when nothing runs on battery. */
  backupLoadW: number;
  /**
   * Each appliance on the system, for working out the battery and how long one lasts (see `outageWh`).
   * Missing on quotes saved before 2026-10-14; only fresh quotes read it.
   */
  backupDraws: BackupDraw[];
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

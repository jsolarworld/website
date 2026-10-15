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
  /** When it is used (see `hoursInBackup`). Missing means "night", the safe assumption, as on quotes saved before 2026-10-15. */
  usageTime?: UsageTime;
}

/**
 * When an appliance is used. "night": all its hours fall inside the backup window. "day": only the hours
 * that spill over from the daylight part of the day do. "both": spread evenly over the day.
 */
export type UsageTime = "night" | "day" | "both";

export interface QuoteInput {
  items: QuoteItem[];
  /** B: the hours the battery carries the house with no sun and no grid, normally the night. At most 24. */
  backupHours: number;
}

/**
 * Sizing assumptions (the sizing spec of 2026-10-14, building on PRD 7.1); the engineers confirm them. Stored
 * in the `quote.settings` row over these defaults, so a key added here takes its default until edited.
 */
export interface QuoteSettings {
  /** Sun hours a day used when the customer's state is unknown: the South's figure, the lowest. */
  peakSunHours: number;
  /** Losses from heat, dust, wiring and the charge controller. */
  pvDerate: number;
  /** An inverter's efficiency when its datasheet figure is not entered. */
  inverterEfficiency: number;
  /** An inverter's no-load draw in watts, all night and all day, when its datasheet figure is not entered. */
  inverterIdleW: number;
  inverterSafetyMargin: number;
  depthOfDischarge: Record<Chemistry, number>;
  /** Share of the energy put into a battery that comes back out. */
  roundTrip: Record<Chemistry, number>;
  /** A panel's voltage on a cold morning, against its Voc: the inverter's solar input limit must hold then. */
  vocColdFactor: number;
  /** A hot panel's working voltage, against its Vmp: it must stay inside the inverter's MPPT range. */
  vmpHotFactor: number;
  /** Budget option must carry at least this share of the battery need. */
  budgetBatteryFloor: number;
  quoteValidityDays: number;
  /** Above this inverter need (continuous watts) no products are offered: the customer is sent to a site visit. */
  autoSizeLimitW: number;
  /** Watts per VA an inverter is counted at when the catalogue has its kVA figure but not its rated watts. */
  inverterPowerFactor: number;
}

/**
 * What the home needs, worked out once from the appliance list (stage 1 of the sizing spec). The energy
 * figures are AC, before any inverter; the battery and solar figures use the default inverter (see
 * `defaultProfile`) and are what the page shows as the home's needs. Each system is sized again for its
 * own inverter (`sizeFor` in systems.ts). Quotes saved before 2026-10-15 lack `backupWh`, `pvW`,
 * `backupHours` and `peakSunHours`, and their figures were worked out the older ways.
 */
export interface Needs {
  /** Everything switched on at once. */
  peakW: number;
  /** `peakW` plus the largest single start-up extra: one motor starts at a time. */
  surgeW: number;
  /** Energy used in a day. */
  dailyWh: number;
  /** Energy used during the backup window. Never more than `dailyWh`. */
  backupWh: number;
  inverterContinuousW: number;
  inverterSurgeW: number;
  /** Solar watts needed, lithium (`pvW.lithium`); kept for the page and for quotes saved before `pvW`. */
  arrayW: number;
  /** Solar watts needed per battery chemistry: tubular loses more on the way in and out. */
  pvW: Record<Chemistry, number>;
  /** Battery nameplate needed, per chemistry. */
  batteryWh: Record<Chemistry, number>;
  /** True when a high-draw item is set to run on the system. */
  highDrawOnBackup: boolean;
  /** B, and the sun hours used, so every later figure uses the same ones. */
  backupHours: number;
  peakSunHours: number;
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
  /** Hours the package's battery carries the backup load; null when nothing runs at night. */
  backupHours: number | null;
  /** With more than a whole day's worth: days of normal use (see `batteryLasts`). */
  backupDays: number | null;
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

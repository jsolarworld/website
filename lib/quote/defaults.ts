import type { QuoteSettings } from "./types";

/**
 * Starting assumptions: PRD 7.1, replaced in part by the sizing spec of 2026-10-14. J Solar World's
 * engineers confirm them. The `quote.settings` row in the database stores edited values over these, so a
 * key added here applies straight away; keys the engine no longer reads (the PRD's `systemDerate` and
 * `diversityFactor`) may still sit in the stored row and are ignored.
 */
export const DEFAULT_SETTINGS: QuoteSettings = {
  // The South's sun hours (Lagos), the lowest of the three regions, for a customer who gives no state (see sun.ts).
  peakSunHours: 4.0,
  pvDerate: 0.8,
  inverterEfficiency: 0.9,
  inverterIdleW: 50,
  inverterSafetyMargin: 1.25,
  depthOfDischarge: { lithium: 0.8, tubular: 0.5 },
  roundTrip: { lithium: 0.95, tubular: 0.8 },
  vocColdFactor: 1.05,
  vmpHotFactor: 0.88,
  budgetBatteryFloor: 0.6,
  quoteValidityDays: 7,
  // Owner decision (2026-10-03): big systems are planned on site. 15 kW is a starting figure for him to confirm.
  autoSizeLimitW: 15_000,
  // Decided 2026-10-11: most inverters in the catalogue have only a kVA figure. 0.8 is the usual rating
  // (10 kVA = 8,000 W) and matches every Yohako model that has both figures; real watts replace it once
  // entered. Kept on 2026-10-14 although the sizing spec says watts only: it never overstates an inverter.
  inverterPowerFactor: 0.8,
};

export const DEFAULT_BACKUP_HOURS = 12;

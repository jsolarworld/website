import type { QuoteSettings } from "./types";

/** Starting assumptions from PRD 7.1; J Solar World's engineers confirm them, admin edits them. */
export const DEFAULT_SETTINGS: QuoteSettings = {
  peakSunHours: 4.0,
  systemDerate: 0.75,
  inverterEfficiency: 0.9,
  inverterSafetyMargin: 1.25,
  depthOfDischarge: { lithium: 0.8, tubular: 0.5 },
  diversityFactor: 0.7,
  budgetBatteryFloor: 0.6,
  quoteValidityDays: 7,
  // Owner decision (2026-10-03): big systems are planned on site. 15 kW is a starting figure for him to confirm.
  autoSizeLimitW: 15_000,
  // Decided 2026-10-11: at 4 sun hours this refills a system's own battery in about a day. Engineers confirm.
  panelWPerBatteryWh: 0.3,
};

export const DEFAULT_BACKUP_HOURS = 12;

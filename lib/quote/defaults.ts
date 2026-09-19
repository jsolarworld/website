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
};

export const DEFAULT_BACKUP_HOURS = 12;

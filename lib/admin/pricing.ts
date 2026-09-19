export type AdjustMode = "percent" | "amount";
export type Rounding = 0 | 100 | 500 | 1000;

export interface Adjustment {
  mode: AdjustMode;
  /** Percent (e.g. 7.5 or -3) or naira (e.g. 20000 or -5000). */
  value: number;
  /** Round the result to the nearest N naira; 0 keeps it exact. */
  round: Rounding;
}

/**
 * New price after a bulk change (PRD ADM-03, for exchange-rate swings). Whole naira, never below 1.
 * Returns null when the result would not be a usable price.
 */
export function adjustPrice(price: number, { mode, value, round }: Adjustment): number | null {
  if (!Number.isFinite(price) || !Number.isFinite(value)) return null;
  const raw = mode === "percent" ? price * (1 + value / 100) : price + value;
  const rounded = round > 0 ? Math.round(raw / round) * round : Math.round(raw);
  return rounded >= 1 ? rounded : null;
}

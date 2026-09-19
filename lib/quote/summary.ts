import { formatNaira } from "../site";
import type { QuoteView } from "./view";

const kwh = (wh: number) => `${(wh / 1000).toFixed(1)} kWh`;

/** Plain-text summary for WhatsApp. Kept short: it is read on a phone. */
export function quoteSummary(view: QuoteView, reference?: string, url?: string): string {
  const n = view.needs;
  const lines = [
    "J Solar World solar quote" + (reference ? ` (${reference})` : ""),
    `Load: ${Math.round(n.peakW)} W, daily use ${kwh(n.dailyWh)}, ${view.backupHours}h backup`,
  ];
  if (view.options.length === 0) {
    lines.push("Next step: site inspection to size your system.");
  } else {
    for (const o of view.options) {
      lines.push(`${o.label}: ${o.name} - ${formatNaira(o.priceNgn)}`);
    }
  }
  if (url) lines.push(url);
  return lines.join("\n");
}

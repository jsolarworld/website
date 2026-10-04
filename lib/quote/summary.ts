import { formatNaira } from "../site";
import type { QuoteView } from "./view";

const kwh = (wh: number) => `${(wh / 1000).toFixed(1)} kWh`;
// A WhatsApp message with every brand would be too long to read on a phone.
const MAX_BRANDS = 4;

/** Plain-text summary for WhatsApp. Kept short: it is read on a phone. */
export function quoteSummary(view: QuoteView, reference?: string, url?: string): string {
  const n = view.needs;
  const lines = [
    "J Solar World solar quote" + (reference ? ` (${reference})` : ""),
    `Load: ${Math.round(n.peakW)} W, daily use ${kwh(n.dailyWh)}, ${view.backupHours}h backup`,
  ];
  for (const o of view.options) {
    lines.push(`${o.label}: ${o.name} - ${formatNaira(o.priceNgn)}`);
  }
  // One line per brand: its cheapest system (the list is already cheapest first).
  const systems = view.systems ?? [];
  const brands = [...new Set(systems.map((o) => o.brand))].slice(0, MAX_BRANDS);
  for (const brand of brands) {
    const o = systems.find((x) => x.brand === brand)!;
    lines.push(`${brand}: ${formatNaira(o.totalNgn)} (${o.lines.map((l) => `${l.quantity} x ${l.name}`).join(", ")})`);
  }
  if (brands.length > 0) lines.push("Cables, breakers and mounting are priced after a site visit.");
  if (view.options.length === 0 && systems.length === 0) lines.push("Next step: site inspection to size your system.");
  if (url) lines.push(url);
  return lines.join("\n");
}

import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "./defaults";
import { computeNeeds } from "./engine";
import { quoteSummary } from "./summary";
import type { QuoteView, SystemView } from "./view";

const needs = computeNeeds({ items: [{ name: "Fan", watts: 75, quantity: 2, hoursPerDay: 8, dutyCycle: 1, surge: 1, highDraw: false, onBackup: true }], backupHours: 8 }, DEFAULT_SETTINGS);
const view = (over: Partial<QuoteView>): QuoteView => ({ needs, backupHours: 8, options: [], custom: true, engineerReview: true, ...over });

const system = (brand: string, kind: "set" | "separate", totalNgn: number): SystemView => ({
  id: `${brand}:${kind}`,
  brand,
  kind,
  chemistry: "lithium",
  lines: [
    { role: "inverter", name: `${brand} inverter`, slug: "inv", quantity: 1, unitPriceNgn: totalNgn - 200_000 },
    { role: "panel", name: "Panel 650W", slug: "p650", quantity: 2, unitPriceNgn: 100_000 },
  ],
  totalNgn,
  inverterContinuousW: 3000,
  batteryWh: 5120,
  backupHours: 12,
  overBudget: false,
});

describe("quoteSummary", () => {
  it("points to a site inspection when there is nothing to offer", () => {
    expect(quoteSummary(view({}), "JSW-ABC234")).toContain("Next step: site inspection");
  });

  it("copes with a quote saved before brand systems existed", () => {
    expect(quoteSummary(view({ systems: undefined }))).toContain("Next step: site inspection");
  });

  it("gives one line per brand, with its cheapest system and the parts", () => {
    const text = quoteSummary(view({ systems: [system("Felicity", "separate", 1_500_000), system("Deye", "separate", 2_000_000), system("Felicity", "set", 2_700_000)] }));
    const lines = text.split("\n");
    expect(lines.filter((l) => l.startsWith("Felicity:"))).toHaveLength(1);
    expect(text).toContain("Felicity: ₦1,500,000 (1 x Felicity inverter, 2 x Panel 650W)");
    expect(text).toContain("Deye: ₦2,000,000");
    expect(text).toContain("priced after a site visit");
    expect(text).not.toContain("Next step: site inspection");
  });

  it("keeps the message short when many brands fit", () => {
    const systems = ["A", "B", "C", "D", "E", "F"].map((b, i) => system(b, "separate", 1_000_000 + i));
    expect(quoteSummary(view({ systems })).split("\n").filter((l) => /^[A-F]:/.test(l))).toHaveLength(4);
  });
});

import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "./defaults";
import { computeNeeds, matchPackages } from "./engine";
import type { QuotePackage } from "./types";
import { buildView } from "./view";

const item = { name: "Fan", watts: 75, quantity: 2, hoursPerDay: 8, dutyCycle: 1, surge: 1, highDraw: false, onBackup: true };
const needs = computeNeeds({ items: [item], backupHours: 8 }, DEFAULT_SETTINGS);

const pkg: QuotePackage = {
  id: "p1",
  name: "3kVA lithium",
  price: 1_500_000,
  chemistry: "lithium",
  inverterContinuousW: 2400,
  inverterSurgeW: 6000,
  batteryWh: 5000,
  arrayW: 1650,
  approved: true,
};
const meta = new Map([["p1", { slug: "3kva-lithium", components: [{ name: "Inverter", slug: "inv", quantity: 1 }] }]]);

describe("buildView", () => {
  it("labels the recommended option and carries package details", () => {
    const v = buildView(matchPackages(needs, [pkg], DEFAULT_SETTINGS), 8, meta);
    expect(v.custom).toBe(false);
    expect(v.options).toHaveLength(1);
    expect(v.options[0]).toMatchObject({ label: "Recommended", slug: "3kva-lithium", priceNgn: 1_500_000 });
    expect(v.options[0].components).toHaveLength(1);
  });

  it("flags options over the customer's budget", () => {
    const v = buildView(matchPackages(needs, [pkg], DEFAULT_SETTINGS), 8, meta, 1_000_000);
    expect(v.options[0].overBudget).toBe(true);
    expect(buildView(matchPackages(needs, [pkg], DEFAULT_SETTINGS), 8, meta, 2_000_000).options[0].overBudget).toBe(false);
  });

  it("is empty and custom when no package fits, and survives JSON", () => {
    const v = buildView(matchPackages(needs, [], DEFAULT_SETTINGS), 8, meta);
    expect(v.options).toHaveLength(0);
    expect(v.custom).toBe(true);
    expect(JSON.parse(JSON.stringify(v))).toEqual(v);
  });
});

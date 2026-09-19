import { describe, expect, it } from "vitest";
import { APPLIANCES, itemFromAppliance } from "./appliances";
import { DEFAULT_SETTINGS } from "./defaults";
import { backupHoursFor, computeNeeds, matchPackages, quote } from "./engine";
import type { QuoteInput, QuotePackage } from "./types";

const byId = (id: string) => APPLIANCES.find((a) => a.id === id)!;

// PRD 7.4: 2-bedroom flat, 10 hours of backup.
const flat: QuoteInput = {
  backupHours: 10,
  items: [
    itemFromAppliance(byId("led-bulb"), 6, 6),
    itemFromAppliance(byId("ceiling-fan"), 2, 8),
    itemFromAppliance(byId("tv-43"), 1, 5),
    itemFromAppliance(byId("decoder"), 1, 5),
    itemFromAppliance(byId("wifi-router"), 1, 24),
    itemFromAppliance(byId("laptop"), 1, 6),
    itemFromAppliance(byId("refrigerator"), 1, 24),
  ],
};

const pkg = (over: Partial<QuotePackage> & Pick<QuotePackage, "id" | "price">): QuotePackage => ({
  name: over.id,
  chemistry: "lithium",
  inverterContinuousW: 3000,
  inverterSurgeW: 6000,
  batteryWh: 5000,
  arrayW: 1650,
  approved: true,
  ...over,
});

describe("computeNeeds (PRD 7.4 worked example)", () => {
  const n = computeNeeds(flat, DEFAULT_SETTINGS);

  it("matches the peak and surge load", () => {
    expect(n.peakW).toBe(535);
    expect(n.surgeW).toBe(835);
  });

  it("matches the inverter need", () => {
    expect(n.inverterContinuousW).toBeCloseTo(668.75);
    expect(n.inverterSurgeW).toBe(835);
  });

  it("matches daily energy and backup load", () => {
    expect(n.dailyWh).toBeCloseTo(4130);
    expect(n.backupLoadW).toBeCloseTo(311.5);
  });

  it("matches battery need for both chemistries", () => {
    expect(n.batteryWh.lithium).toBeCloseTo(4326, 0);
    expect(n.batteryWh.tubular).toBeCloseTo(6922, 0);
  });

  it("matches the array need", () => {
    expect(n.arrayW).toBeCloseTo(1377, 0);
    expect(Math.ceil(n.arrayW / 550)).toBe(3);
  });
});

describe("backupHoursFor", () => {
  it("gives about 11.5 h for a 5 kWh lithium package", () => {
    const n = computeNeeds(flat, DEFAULT_SETTINGS);
    expect(backupHoursFor(pkg({ id: "a", price: 1 }), n, DEFAULT_SETTINGS)).toBeCloseTo(11.56, 1);
  });

  it("is null when nothing is on backup", () => {
    const input = { ...flat, items: flat.items.map((i) => ({ ...i, onBackup: false })) };
    const n = computeNeeds(input, DEFAULT_SETTINGS);
    expect(backupHoursFor(pkg({ id: "a", price: 1 }), n, DEFAULT_SETTINGS)).toBeNull();
  });
});

describe("surge uses the single largest motor start-up", () => {
  it("does not add every motor's extra", () => {
    const input: QuoteInput = {
      backupHours: 4,
      items: [
        itemFromAppliance(byId("refrigerator"), 1, 24), // extra 300
        itemFromAppliance(byId("chest-freezer"), 1, 24), // extra 400
      ],
    };
    const n = computeNeeds(input, DEFAULT_SETTINGS);
    expect(n.surgeW).toBe(350 + 400);
  });
});

describe("high-draw items", () => {
  it("default off backup and do not flag review", () => {
    const item = itemFromAppliance(byId("electric-kettle"), 1, 1);
    expect(item.onBackup).toBe(false);
    const n = computeNeeds({ backupHours: 8, items: [item] }, DEFAULT_SETTINGS);
    expect(n.backupLoadW).toBe(0);
    expect(n.highDrawOnBackup).toBe(false);
  });

  it("flag engineer review when kept on backup", () => {
    const item = itemFromAppliance(byId("electric-kettle"), 1, 1, true);
    const r = quote({ backupHours: 8, items: [item] }, [pkg({ id: "big", price: 1 })], DEFAULT_SETTINGS);
    expect(r.engineerReview).toBe(true);
  });
});

describe("matchPackages (PRD 7.3)", () => {
  const n = computeNeeds(flat, DEFAULT_SETTINGS);
  const s = DEFAULT_SETTINGS;

  const small = pkg({ id: "small", price: 500_000, batteryWh: 2600, arrayW: 1100 }); // 60% battery floor, array short
  const fit = pkg({ id: "fit", price: 900_000 });
  const bigger = pkg({ id: "bigger", price: 1_400_000, batteryWh: 10_000, arrayW: 3300 });

  it("recommends the cheapest package that meets every need", () => {
    const r = matchPackages(n, [bigger, fit, small], s);
    expect(r.recommended?.package.id).toBe("fit");
    expect(r.recommended?.backupHours).toBeGreaterThan(10);
    expect(r.custom).toBe(false);
  });

  it("offers the next approved package up as headroom", () => {
    const r = matchPackages(n, [bigger, fit, small], s);
    expect(r.headroom?.package.id).toBe("bigger");
  });

  it("offers a cheaper budget package with less backup, stated plainly", () => {
    const r = matchPackages(n, [bigger, fit, small], s);
    expect(r.budget?.package.id).toBe("small");
    expect(r.budget!.backupHours!).toBeLessThan(10);
  });

  it("hides budget when it would be the recommended package", () => {
    const r = matchPackages(n, [fit, bigger], s);
    expect(r.budget).toBeNull();
  });

  it("rejects a budget package below the 60% battery floor", () => {
    const tiny = pkg({ id: "tiny", price: 300_000, batteryWh: 2000 });
    const r = matchPackages(n, [tiny, fit], s);
    expect(r.budget).toBeNull();
  });

  it("ignores unapproved packages", () => {
    const r = matchPackages(n, [{ ...fit, approved: false }, bigger], s);
    expect(r.recommended?.package.id).toBe("bigger");
  });

  it("does not accept an inverter with enough continuous watts but too little surge", () => {
    const weak = pkg({ id: "weak", price: 100, inverterSurgeW: 800 });
    expect(matchPackages(n, [weak], s).recommended).toBeNull();
  });

  it("goes custom, and flags review, when nothing fits", () => {
    const r = matchPackages(n, [pkg({ id: "tiny", price: 1, inverterContinuousW: 300 })], s);
    expect(r.custom).toBe(true);
    expect(r.recommended).toBeNull();
    expect(r.engineerReview).toBe(true);
  });

  it("sizes tubular batteries with the lower depth of discharge", () => {
    const tubular5k = pkg({ id: "t5", price: 700_000, chemistry: "tubular" });
    const tubular8k = pkg({ id: "t8", price: 900_000, chemistry: "tubular", batteryWh: 8000 });
    const r = matchPackages(n, [tubular5k, tubular8k, fit], s, "tubular");
    expect(r.recommended?.package.id).toBe("t8");
  });

  it("breaks price ties by id so results are stable", () => {
    const a = pkg({ id: "a", price: 900_000 });
    const b = pkg({ id: "b", price: 900_000 });
    expect(matchPackages(n, [b, a], s).recommended?.package.id).toBe("a");
  });
});

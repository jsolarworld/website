import { describe, expect, it } from "vitest";
import { APPLIANCES, itemFromAppliance } from "./appliances";
import { DEFAULT_SETTINGS } from "./defaults";
import { backupHoursFor, computeNeeds, hoursCovered, leftOff, matchPackages, outageWh, quote } from "./engine";
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

  it("counts each appliance for its own hours, not the whole outage (changed from PRD 7.4 on 2026-10-14)", () => {
    // PRD 7.4 ran everything for all 10 hours: 4,326 Wh lithium. Now the bulbs count 6 hours, the fans 8,
    // the TV and decoder 5, the laptop 6, and only the router and fridge the full 10:
    // (360 + 1,200 + 400 + 100 + 100 + 390 + 600) × 0.7 = 2,205 Wh, ÷ (0.8 × 0.9) lithium or ÷ (0.5 × 0.9) tubular.
    expect(n.batteryWh.lithium).toBeCloseTo(3062.5, 1);
    expect(n.batteryWh.tubular).toBeCloseTo(4900, 1);
  });

  it("matches the array need", () => {
    expect(n.arrayW).toBeCloseTo(1377, 0);
    expect(Math.ceil(n.arrayW / 550)).toBe(3);
  });
});

describe("array need", () => {
  it("covers everything running at once in full sun when that is more than a day's energy asks for", () => {
    // A 1,500 W kettle (ticked, so the system powers it) for 15 minutes: 375 Wh a day needs only 125 W of
    // panels, but running it needs 1,500 / 0.75.
    const n = computeNeeds({ backupHours: 8, items: [itemFromAppliance(byId("electric-kettle"), 1, 0.25, true)] }, DEFAULT_SETTINGS);
    expect(n.arrayW).toBeCloseTo(2000);
  });
});

describe("appliances left off the system", () => {
  const heater = itemFromAppliance(byId("water-heater"), 1, 2);
  const pump = itemFromAppliance(byId("water-pump-1-5hp"), 1, 1);

  it("are left out of every figure, so the home is sized as if they were not listed", () => {
    expect([heater.onBackup, pump.onBackup]).toEqual([false, false]);
    const withThem = computeNeeds({ ...flat, items: [...flat.items, heater, pump] }, DEFAULT_SETTINGS);
    expect(withThem).toEqual(computeNeeds(flat, DEFAULT_SETTINGS));
  });

  it("count in full once the customer ticks them", () => {
    const ticked = computeNeeds({ ...flat, items: [...flat.items, { ...pump, onBackup: true }] }, DEFAULT_SETTINGS);
    expect(ticked.peakW).toBe(535 + 1500);
    // The pump's start-up (four times its running watts) is now the largest.
    expect(ticked.surgeW).toBe(535 + 1500 + 4500);
    expect(ticked.highDrawOnBackup).toBe(true);
  });

  it("are named once each, for the quote to say they stay on mains", () => {
    expect(leftOff({ ...flat, items: [...flat.items, heater, pump, heater] })).toEqual(["Water heater with tank", "Water pump, 1.5 HP"]);
    expect(leftOff(flat)).toEqual([]);
  });
});

describe("battery for an outage", () => {
  const s = DEFAULT_SETTINGS;
  const tv = { w: 80, hoursPerDay: 5 };
  const fridge = { w: 60, hoursPerDay: 24 };

  it("counts an appliance for its own hours, but never longer than the outage", () => {
    expect(outageWh([tv], 12, s)).toBeCloseTo(80 * 5 * 0.7);
    expect(outageWh([tv], 3, s)).toBeCloseTo(80 * 3 * 0.7);
  });

  it("is the PRD's figure when everything runs at least as long as the outage", () => {
    const n = computeNeeds({ backupHours: 10, items: flat.items.filter((i) => i.hoursPerDay >= 10) }, s);
    expect(n.batteryWh.lithium).toBeCloseTo((n.backupLoadW * 10) / (0.8 * 0.9));
  });

  it("works out the hours a battery lasts by the same rule", () => {
    // 1 kWh lithium gives 720 Wh. The TV and fridge use 98 Wh an hour for 5 hours (490), then the fridge 42.
    expect(hoursCovered(1000, "lithium", [tv, fridge], s)).toBeCloseTo(5 + 230 / 42, 5);
    // ...and a battery sized for an outage covers that outage.
    const n = computeNeeds({ ...flat, backupHours: 7 }, s);
    expect(hoursCovered(n.batteryWh.lithium, "lithium", n.backupDraws, s)).toBeCloseTo(7, 5);
  });

  it("says 24 hours when the battery covers a whole day of use", () => {
    expect(hoursCovered(100_000, "lithium", [tv, fridge], s)).toBe(24);
  });
});

describe("backupHoursFor", () => {
  it("covers a whole day of the flat's use with a 5 kWh lithium package", () => {
    const n = computeNeeds(flat, DEFAULT_SETTINGS);
    expect(backupHoursFor(pkg({ id: "a", price: 1 }), n, DEFAULT_SETTINGS)).toBe(24);
  });

  it("gives part of a day for a smaller battery", () => {
    // 2.6 kWh gives 1,872 Wh: 5 h at 311.5 Wh an hour, 1 h more at 241.5 once the TV and decoder are off,
    // then 154 an hour once the bulbs and laptop are off too.
    const n = computeNeeds(flat, DEFAULT_SETTINGS);
    expect(backupHoursFor(pkg({ id: "a", price: 1, batteryWh: 2600 }), n, DEFAULT_SETTINGS)).toBeCloseTo(6 + 73 / 154, 5);
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
  it("start off the system and do not flag review", () => {
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
    // 60% of 3,062.5 Wh is 1,837.5.
    const tiny = pkg({ id: "tiny", price: 300_000, batteryWh: 1800 });
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
    // 4.5 kWh would be plenty as lithium (3,062.5 Wh), but tubular needs 4,900.
    const tubular45 = pkg({ id: "t4.5", price: 700_000, chemistry: "tubular", batteryWh: 4500 });
    const tubular8k = pkg({ id: "t8", price: 900_000, chemistry: "tubular", batteryWh: 8000 });
    const r = matchPackages(n, [tubular45, tubular8k, fit], s, "tubular");
    expect(r.recommended?.package.id).toBe("t8");
  });

  it("breaks price ties by id so results are stable", () => {
    const a = pkg({ id: "a", price: 900_000 });
    const b = pkg({ id: "b", price: 900_000 });
    expect(matchPackages(n, [b, a], s).recommended?.package.id).toBe("a");
  });
});

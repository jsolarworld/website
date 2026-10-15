import { describe, expect, it } from "vitest";
import { APPLIANCES, itemFromAppliance } from "./appliances";
import { DEFAULT_SETTINGS } from "./defaults";
import { backupHoursFor, batteryLasts, computeNeeds, defaultProfile, hoursInBackup, leftOff, matchPackages, quote } from "./engine";
import type { QuoteInput, QuoteItem, QuotePackage, UsageTime } from "./types";

const byId = (id: string) => APPLIANCES.find((a) => a.id === id)!;
const s = DEFAULT_SETTINGS;

const row = (name: string, quantity: number, watts: number, hoursPerDay: number, dutyCycle = 1, surge = 1, usageTime: UsageTime = "night"): QuoteItem => ({
  name,
  watts,
  quantity,
  hoursPerDay,
  dutyCycle,
  surge,
  highDraw: false,
  onBackup: true,
  usageTime,
});

// The sizing spec's worked example, quote JSW-JRZKHY, with the spec's own duty and surge factors.
const jrzkhy: QuoteInput = {
  backupHours: 12,
  items: [
    row("Ceiling fan", 2, 75, 13.75),
    row("Inverter AC", 1, 1200, 6, 0.6, 1.5),
    row("TV", 1, 80, 5),
    row("Sound system", 1, 100, 5),
    row("Fridge", 1, 150, 24, 0.5, 4),
    row("Phone charger", 5, 10, 5.25),
    row("Laptop", 3, 65, 6),
  ],
};

describe("the sizing spec's worked example (quote JSW-JRZKHY)", () => {
  const n = computeNeeds(jrzkhy, s);

  it("matches the day's energy and the backup window's", () => {
    expect(n.dailyWh).toBeCloseTo(10_515);
    expect(n.backupWh).toBeCloseTo(9_352.5);
  });

  it("matches the battery for both chemistries", () => {
    expect(n.batteryWh.lithium).toBeCloseTo(13_739.6, 0);
    expect(n.batteryWh.tubular).toBeCloseTo(21_983.3, 0);
  });

  it("matches the solar need: 4,207 W, so seven 650 W panels", () => {
    expect(n.pvW.lithium).toBeCloseTo(4_206.8, 0);
    expect(n.arrayW).toBe(n.pvW.lithium);
    expect(Math.ceil(n.pvW.lithium / 650)).toBe(7);
  });

  it("needs 2.5 kW of inverter that starts 2.5 kW", () => {
    expect(n.inverterContinuousW).toBeCloseTo(2_406.25);
    // 1,925 W running plus the AC's start-up extra (600 W), larger than the fridge's (450 W).
    expect(n.inverterSurgeW).toBe(2_525);
  });

  it("matches the cards: a 15 kWh battery lasts about 13.1 hours, a 60 kWh one about 3.7 days", () => {
    const p = defaultProfile(s);
    expect(batteryLasts(15_000, "lithium", n, p, s)).toEqual({ hours: expect.closeTo(13.1, 1), days: null });
    expect(batteryLasts(60_000, "lithium", n, p, s)?.days).toBeCloseTo(3.7, 1);
  });

  it("needs a much smaller battery when the AC is used in the day", () => {
    const daytimeAc = computeNeeds({ ...jrzkhy, items: jrzkhy.items.map((i) => (i.name === "Inverter AC" ? { ...i, usageTime: "day" as const } : i)) }, s);
    expect(daytimeAc.backupWh).toBeCloseTo(9_352.5 - 4_320);
    expect(daytimeAc.batteryWh.lithium).toBeCloseTo(7_739.6, 0);
  });
});

describe("the sizing spec's rules", () => {
  it("counts the whole day's use in a 24-hour backup window, however each appliance is used", () => {
    for (const usage of ["night", "day", "both"] as const) {
      const n = computeNeeds({ backupHours: 24, items: jrzkhy.items.map((i) => ({ ...i, usageTime: usage })) }, s);
      expect(n.backupWh).toBeCloseTo(n.dailyWh);
    }
  });

  it("never puts more of an appliance's hours in the backup window than it is used", () => {
    for (const hours of [0.25, 3, 12, 20, 24])
      for (const usage of ["night", "day", "both"] as const)
        for (const window of [1, 4, 8, 12, 18, 24]) {
          const inWindow = hoursInBackup(hours, usage, window);
          expect(inWindow).toBeGreaterThanOrEqual(0);
          expect(inWindow).toBeLessThanOrEqual(hours + 1e-9);
          expect(inWindow).toBeLessThanOrEqual(window + 1e-9);
        }
  });

  it("adds an hour of pressing iron as 600 Wh of backup and 833 Wh of lithium, not a whole night's worth", () => {
    const before = computeNeeds(jrzkhy, s);
    const after = computeNeeds({ ...jrzkhy, items: [...jrzkhy.items, row("Pressing iron", 1, 1000, 1, 0.6)] }, s);
    expect(after.backupWh - before.backupWh).toBeCloseTo(600);
    expect(after.batteryWh.lithium - before.batteryWh.lithium).toBeCloseTo(833.3, 1);
  });

  it("gives exactly the hours asked for with a battery at its target", () => {
    const n = computeNeeds(jrzkhy, s);
    expect(batteryLasts(n.batteryWh.lithium, "lithium", n, defaultProfile(s), s)?.hours).toBeCloseTo(12, 6);
    expect(batteryLasts(n.batteryWh.tubular, "tubular", n, defaultProfile(s), s)?.hours).toBeCloseTo(12, 6);
  });

  it("never asks for less battery or fewer panels when an appliance is used more", () => {
    const base = computeNeeds(jrzkhy, s);
    const more = [
      (i: QuoteItem) => ({ ...i, hoursPerDay: Math.min(24, i.hoursPerDay + 2) }),
      (i: QuoteItem) => ({ ...i, watts: i.watts * 1.5 }),
      (i: QuoteItem) => ({ ...i, quantity: i.quantity + 1 }),
    ];
    for (const change of more)
      for (const k of jrzkhy.items.keys()) {
        const n = computeNeeds({ ...jrzkhy, items: jrzkhy.items.map((i, j) => (j === k ? change(i) : i)) }, s);
        expect(n.batteryWh.lithium).toBeGreaterThanOrEqual(base.batteryWh.lithium - 1e-9);
        expect(n.pvW.lithium).toBeGreaterThanOrEqual(base.pvW.lithium - 1e-9);
      }
  });

  it("splits a day-and-night appliance evenly, and takes only the spill-over of a daytime one", () => {
    expect(hoursInBackup(6, "both", 12)).toBe(3);
    expect(hoursInBackup(6, "day", 12)).toBe(0);
    expect(hoursInBackup(16, "day", 12)).toBe(4);
    expect(hoursInBackup(16, "night", 12)).toBe(12);
  });

  it("treats an appliance with no usage time as used at night", () => {
    const old: QuoteItem = { ...jrzkhy.items[0] };
    delete old.usageTime;
    expect(computeNeeds({ backupHours: 12, items: [old] }, s).backupWh).toBeCloseTo(150 * 12);
  });
});

// PRD 7.4: 2-bedroom flat, 10 hours of backup, with today's library factors (the fridge at duty 0.5 and surge 4).
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
  batteryWh: 6000,
  arrayW: 2400,
  approved: true,
  ...over,
});

describe("computeNeeds (PRD 7.4 flat)", () => {
  const n = computeNeeds(flat, s);

  it("matches the peak load and the inverter need", () => {
    expect(n.peakW).toBe(535);
    expect(n.inverterContinuousW).toBeCloseTo(668.75);
    // The fridge's start-up extra: 150 × (4 − 1).
    expect(n.inverterSurgeW).toBe(985);
  });

  it("works out the day's energy, the backup window's, the battery and the panels", () => {
    expect(n.dailyWh).toBeCloseTo(4_490);
    expect(n.backupWh).toBeCloseTo(3_300);
    expect(n.batteryWh.lithium).toBeCloseTo(5_208.3, 1);
    expect(n.batteryWh.tubular).toBeCloseTo(8_333.3, 1);
    expect(n.pvW.lithium).toBeCloseTo(2_002.6, 1);
    expect(n.pvW.tubular).toBeCloseTo(2_259.5, 1);
  });

  it("carries the backup window and the sun hours for the later figures", () => {
    expect(n).toMatchObject({ backupHours: 10, peakSunHours: 4 });
    expect(computeNeeds(flat, { ...s, peakSunHours: 5 }).pvW.lithium).toBeCloseTo((2_002.6 * 4) / 5, 0);
  });
});

describe("appliances left off the system", () => {
  const heater = itemFromAppliance(byId("water-heater"), 1, 2);
  const pump = itemFromAppliance(byId("water-pump-1-5hp"), 1, 1);

  it("are left out of every figure, so the home is sized as if they were not listed", () => {
    expect([heater.onBackup, pump.onBackup]).toEqual([false, false]);
    const withThem = computeNeeds({ ...flat, items: [...flat.items, heater, pump] }, s);
    expect(withThem).toEqual(computeNeeds(flat, s));
  });

  it("count in full once the customer ticks them", () => {
    const ticked = computeNeeds({ ...flat, items: [...flat.items, { ...pump, onBackup: true }] }, s);
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

describe("backupHoursFor", () => {
  it("gives the hours asked for with a battery at its target, and more with a bigger one", () => {
    const n = computeNeeds(flat, s);
    expect(backupHoursFor(pkg({ id: "a", price: 1, batteryWh: n.batteryWh.lithium }), n, s)).toBeCloseTo(10, 6);
    expect(backupHoursFor(pkg({ id: "a", price: 1 }), n, s)).toBeCloseTo(11.52, 2);
  });

  it("is null when nothing is on backup", () => {
    const input = { ...flat, items: flat.items.map((i) => ({ ...i, onBackup: false })) };
    expect(backupHoursFor(pkg({ id: "a", price: 1 }), computeNeeds(input, s), s)).toBeNull();
  });
});

describe("surge uses the single largest motor start-up", () => {
  it("does not add every motor's extra", () => {
    const input: QuoteInput = {
      backupHours: 4,
      items: [
        itemFromAppliance(byId("refrigerator"), 1, 24), // extra 450
        itemFromAppliance(byId("chest-freezer"), 1, 24), // extra 600
      ],
    };
    expect(computeNeeds(input, s).surgeW).toBe(350 + 600);
  });
});

describe("high-draw items", () => {
  it("start off the system and do not flag review", () => {
    const item = itemFromAppliance(byId("electric-kettle"), 1, 1);
    expect(item.onBackup).toBe(false);
    const n = computeNeeds({ backupHours: 8, items: [item] }, s);
    expect(n.backupWh).toBe(0);
    expect(n.highDrawOnBackup).toBe(false);
  });

  it("flag engineer review when kept on backup", () => {
    const item = itemFromAppliance(byId("electric-kettle"), 1, 1, true);
    const r = quote({ backupHours: 8, items: [item] }, [pkg({ id: "big", price: 1 })], s);
    expect(r.engineerReview).toBe(true);
  });
});

describe("matchPackages (PRD 7.3)", () => {
  // The flat needs 5,208 Wh of lithium (8,333 tubular) and 2,003 W of panels (2,260 with tubular).
  const n = computeNeeds(flat, s);

  const small = pkg({ id: "small", price: 500_000, batteryWh: 3200, arrayW: 1100 }); // above the 60% battery floor, panels short
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
    // 60% of 5,208 Wh is 3,125.
    const tiny = pkg({ id: "tiny", price: 300_000, batteryWh: 3000 });
    const r = matchPackages(n, [tiny, fit], s);
    expect(r.budget).toBeNull();
  });

  it("ignores unapproved packages", () => {
    const r = matchPackages(n, [{ ...fit, approved: false }, bigger], s);
    expect(r.recommended?.package.id).toBe("bigger");
  });

  it("does not accept an inverter with enough continuous watts but too little surge", () => {
    const weak = pkg({ id: "weak", price: 100, inverterSurgeW: 900 });
    expect(matchPackages(n, [weak], s).recommended).toBeNull();
  });

  it("goes custom, and flags review, when nothing fits", () => {
    const r = matchPackages(n, [pkg({ id: "tiny", price: 1, inverterContinuousW: 300 })], s);
    expect(r.custom).toBe(true);
    expect(r.recommended).toBeNull();
    expect(r.engineerReview).toBe(true);
  });

  it("sizes tubular batteries with the lower depth of discharge, and their panels with the bigger losses", () => {
    // 6 kWh would be plenty as lithium (5,208 Wh), but tubular needs 8,333, and 2,260 W of panels where lithium needs 2,003.
    const tubular6 = pkg({ id: "t6", price: 700_000, chemistry: "tubular" });
    const tubular9 = pkg({ id: "t9", price: 900_000, chemistry: "tubular", batteryWh: 9000 });
    const tubular9thin = pkg({ id: "t9-thin", price: 850_000, chemistry: "tubular", batteryWh: 9000, arrayW: 2100 });
    const r = matchPackages(n, [tubular6, tubular9thin, tubular9, fit], s, "tubular");
    expect(r.recommended?.package.id).toBe("t9");
  });

  it("breaks price ties by id so results are stable", () => {
    const a = pkg({ id: "a", price: 900_000 });
    const b = pkg({ id: "b", price: 900_000 });
    expect(matchPackages(n, [b, a], s).recommended?.package.id).toBe("a");
  });
});

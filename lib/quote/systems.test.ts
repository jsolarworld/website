import { describe, expect, it } from "vitest";
import { APPLIANCES, itemFromAppliance } from "./appliances";
import { DEFAULT_SETTINGS } from "./defaults";
import { computeNeeds } from "./engine";
import {
  buildSystems,
  fullyPriced,
  layoutPanels,
  pickPanel,
  tooLarge,
  voltageClass,
  type BatteryPart,
  type InverterPart,
  type PanelPart,
  type Parts,
  type PvLimits,
  type SetPart,
} from "./systems";
import type { QuoteInput, QuoteItem } from "./types";

const byId = (id: string) => APPLIANCES.find((a) => a.id === id)!;
const s = DEFAULT_SETTINGS;

// PRD 7.4 flat: needs 669 W continuous, 985 W at start-up, 5.21 kWh of lithium (8.33 tubular) and 2,003 W of
// panels (2,260 with tubular), all with the default inverter (0.90 efficient, 50 W idle).
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
const needs = computeNeeds(flat, s);

const part = (id: string, price: number | null) => ({ id, name: id, slug: id, price, stock: null });
const inverter = (id: string, brand: string, price: number | null, over: Partial<InverterPart> = {}): InverterPart => ({
  ...part(id, price),
  brand,
  continuousW: 3000,
  surgeW: 6000,
  systemVoltage: 24,
  ...over,
});
const lithium = (id: string, brand: string, price: number | null, wh: number, voltage = 25.6, over: Partial<BatteryPart> = {}): BatteryPart => ({
  ...part(id, price),
  brand,
  chemistry: "lithium",
  wh,
  voltage,
  ...over,
});
const tubular = (id: string, brand: string, price: number): BatteryPart => ({ ...part(id, price), brand, chemistry: "tubular", wh: 2400, voltage: 12 });
const set = (id: string, brand: string, price: number, over: Partial<SetPart> = {}): SetPart => ({
  ...part(id, price),
  brand,
  continuousW: 5000,
  surgeW: 10000,
  batteryWh: 6000,
  ...over,
});
const panel = (id: string, price: number | null, watts: number, stock: number | null = null, over: Partial<PanelPart> = {}): PanelPart => ({
  ...part(id, price),
  watts,
  stock,
  ...over,
});

const parts = (over: Partial<Parts>): Parts => ({ inverters: [], batteries: [], sets: [], panels: [panel("p550", 110_000, 550)], ...over });
const ids = (list: ReturnType<typeof buildSystems>) => list.map((o) => o.id);
const panelsOf = (o: ReturnType<typeof buildSystems>[number]) => o.lines.find((l) => l.role === "panel")?.quantity;

describe("buildSystems", () => {
  it("pairs a brand's inverter with enough of its own batteries and counts the panels from the home's use", () => {
    const [o] = buildSystems(needs, parts({ inverters: [inverter("inv", "Felicity", 400_000)], batteries: [lithium("b25", "Felicity", 350_000, 2560)] }), s);
    // 5,208 Wh from 2,560 Wh packs takes three; 2,003 W of panels takes four of 550 W.
    expect(o).toMatchObject({ id: "Felicity:separate", brand: "Felicity", kind: "separate", chemistry: "lithium", batteryWh: 7680, short: false });
    expect(o.lines.map((l) => [l.role, l.quantity])).toEqual([["inverter", 1], ["battery", 3], ["panel", 4]]);
    expect(o.totalNgn).toBe(400_000 + 3 * 350_000 + 4 * 110_000);
    expect(o.backupHours).toBeGreaterThan(10);
  });

  it("never mixes brands", () => {
    const systems = buildSystems(needs, parts({ inverters: [inverter("inv", "Felicity", 400_000)], batteries: [lithium("b", "Cworth", 300_000, 5000)] }), s);
    expect(systems).toEqual([]);
  });

  it("skips an inverter that is too small or cannot take the start-up surge", () => {
    const small = inverter("small", "Deye", 100_000, { continuousW: 600 });
    const weak = inverter("weak", "Deye", 150_000, { surgeW: 900 });
    const good = inverter("good", "Deye", 500_000);
    const [o] = buildSystems(needs, parts({ inverters: [small, weak, good], batteries: [lithium("b", "Deye", 300_000, 5400)] }), s);
    expect(o.lines[0].slug).toBe("good");
  });

  it("only uses lithium batteries at the inverter's own voltage", () => {
    const b48 = lithium("b48", "Felicity", 100_000, 5400, 51.2);
    const b24 = lithium("b24", "Felicity", 900_000, 5400, 25.6);
    const [o] = buildSystems(needs, parts({ inverters: [inverter("inv", "Felicity", 400_000)], batteries: [b48, b24] }), s);
    expect(o.lines[1].slug).toBe("b24");
  });

  it("picks the battery model that reaches the target for the least money", () => {
    const three = lithium("small", "Felicity", 300_000, 2560); // 3 needed: 900,000
    const one = lithium("big", "Felicity", 550_000, 5400); // 1 needed: 550,000
    const [o] = buildSystems(needs, parts({ inverters: [inverter("inv", "Felicity", 400_000)], batteries: [three, one] }), s);
    expect(o.lines[1]).toMatchObject({ slug: "big", quantity: 1 });
  });

  it("sizes the battery for the inverter's own losses", () => {
    const thrifty = inverter("thrifty", "Felicity", 400_000, { efficiency: 0.95, idleW: 20 });
    const thirsty = inverter("thirsty", "Felicity", 400_000, { efficiency: 0.85, idleW: 100 });
    const pack = lithium("b", "Felicity", 100_000, 1000);
    // (3,300 / 0.95 + 20 × 10) / 0.8 = 4,592 Wh, five packs; (3,300 / 0.85 + 100 × 10) / 0.8 = 6,103 Wh, seven.
    const count = (inv: InverterPart) => buildSystems(needs, parts({ inverters: [inv], batteries: [{ ...pack, maxParallel: 10 }] }), s)[0].lines[1].quantity;
    expect([count(thrifty), count(thirsty)]).toEqual([5, 7]);
  });

  it("leaves a brand out when it would take more than four battery strings and the battery gives no limit", () => {
    const tiny = lithium("tiny", "Felicity", 50_000, 700);
    expect(buildSystems(needs, parts({ inverters: [inverter("inv", "Felicity", 400_000)], batteries: [tiny] }), s)).toEqual([]);
  });

  it("stops at the battery's own parallel limit, and says the system falls short", () => {
    const tiny = lithium("tiny", "Felicity", 50_000, 700, 25.6, { maxParallel: 6 });
    const [o] = buildSystems(needs, parts({ inverters: [inverter("inv", "Felicity", 400_000)], batteries: [tiny] }), s);
    expect(o).toMatchObject({ batteryWh: 4200, short: true });
    expect(o.backupHours!).toBeLessThan(10);
  });

  it("wires 12 V tubular batteries in series to the inverter's voltage, with more panels for their losses", () => {
    // 24 V system: strings of two 2.4 kWh blocks; 8.33 kWh needed, so two strings.
    const [o] = buildSystems(needs, parts({ inverters: [inverter("inv", "Felicity", 400_000)], batteries: [tubular("t200", "Felicity", 250_000)] }), s);
    expect(o).toMatchObject({ chemistry: "tubular", batteryWh: 9600 });
    expect(o.lines[1].quantity).toBe(4);
    // 2,260 W where lithium needs 2,003: five panels instead of four.
    expect(panelsOf(o)).toBe(5);
  });

  it("follows the battery type the customer asked for", () => {
    const p = parts({
      inverters: [inverter("inv", "Felicity", 400_000)],
      batteries: [lithium("li", "Felicity", 500_000, 5400), tubular("t200", "Felicity", 250_000)],
      sets: [set("aio", "Felicity", 2_000_000)],
    });
    expect(buildSystems(needs, p, s, "tubular").map((o) => [o.kind, o.chemistry])).toEqual([["separate", "tubular"]]);
    expect(buildSystems(needs, p, s, "lithium").map((o) => [o.kind, o.chemistry])).toEqual([
      ["separate", "lithium"],
      ["set", "lithium"],
    ]);
  });

  it("offers a brand's cheapest set whose battery reaches the target", () => {
    const p = parts({
      sets: [set("thin", "Cworth", 1_000_000, { batteryWh: 3000 }), set("fit", "Cworth", 2_500_000), set("big", "Cworth", 3_000_000, { batteryWh: 16_000 })],
    });
    const [o] = buildSystems(needs, p, s);
    expect(o).toMatchObject({ id: "Cworth:set", kind: "set", batteryWh: 6000, short: false });
    expect(o.lines[0].slug).toBe("fit");
    expect(o.totalNgn).toBe(2_500_000 + 4 * 110_000);
  });

  it("still shows a set whose fixed battery falls short, with the hours it really gives", () => {
    const [o] = buildSystems(needs, parts({ sets: [set("thin", "Cworth", 1_000_000, { batteryWh: 3000 })] }), s);
    expect(o.short).toBe(true);
    // 3 kWh × 0.8 gives 2,400 Wh, at 4,167 Wh per 10 hours.
    expect(o.backupHours).toBeCloseTo(5.76, 2);
  });

  it("counts the panels from the home's use, whatever the battery", () => {
    const fit = buildSystems(needs, parts({ sets: [set("fit", "Cworth", 2_500_000)] }), s)[0];
    const big = buildSystems(needs, parts({ sets: [set("big", "Cworth", 3_000_000, { batteryWh: 60_000 })] }), s)[0];
    expect([panelsOf(fit), panelsOf(big)]).toEqual([4, 4]);
    const inv = inverter("inv", "Felicity", 400_000);
    const withSmall = buildSystems(needs, parts({ inverters: [inv], batteries: [lithium("a", "Felicity", 300_000, 2560)] }), s)[0];
    const withBig = buildSystems(needs, parts({ inverters: [inv], batteries: [lithium("b", "Felicity", 900_000, 16_000)] }), s)[0];
    expect(panelsOf(withSmall)).toBe(panelsOf(withBig));
  });

  it("says how many days a battery with more than a day's use stored lasts", () => {
    const [o] = buildSystems(needs, parts({ sets: [set("big", "Cworth", 3_000_000, { batteryWh: 60_000 })] }), s);
    // 48 kWh usable over a day's 6,189 Wh.
    expect(o.backupDays).toBeCloseTo(7.76, 2);
  });

  it("lists every brand, cheapest first, with the set and the separate pairing side by side", () => {
    const p = parts({
      inverters: [inverter("f-inv", "Felicity", 400_000), inverter("d-inv", "Deye", 900_000)],
      batteries: [lithium("f-b", "Felicity", 550_000, 5400), lithium("d-b", "Deye", 950_000, 5400)],
      sets: [set("f-set", "Felicity", 2_500_000)],
    });
    expect(ids(buildSystems(needs, p, s))).toEqual(["Felicity:separate", "Deye:separate", "Felicity:set"]);
  });

  it("puts a system that falls short after those that reach the target, however cheap", () => {
    const p = parts({
      inverters: [inverter("d-inv", "Deye", 900_000)],
      batteries: [lithium("d-b", "Deye", 950_000, 5400)],
      sets: [set("c-thin", "Cworth", 500_000, { batteryWh: 3000 })],
    });
    expect(ids(buildSystems(needs, p, s))).toEqual(["Deye:separate", "Cworth:set"]);
  });

  it("respects stock, and treats on-request items as available", () => {
    const pack = lithium("b", "Felicity", 300_000, 2560, 25.6, { stock: 2 });
    const inv = inverter("inv", "Felicity", 400_000);
    expect(buildSystems(needs, parts({ inverters: [inv], batteries: [pack] }), s)).toEqual([]);
    expect(buildSystems(needs, parts({ inverters: [inv], batteries: [{ ...pack, stock: 3 }] }), s)).toHaveLength(1);
    expect(buildSystems(needs, parts({ inverters: [{ ...inv, stock: 0 }], batteries: [{ ...pack, stock: null }] }), s)).toEqual([]);
  });

  it("still includes one battery when nothing runs on backup", () => {
    const none = computeNeeds({ backupHours: 8, items: [itemFromAppliance(byId("electric-kettle"), 1, 0.25)] }, s);
    const [o] = buildSystems(none, parts({ inverters: [inverter("inv", "Felicity", 400_000)], batteries: [lithium("b", "Felicity", 300_000, 2560)] }), s);
    expect(o.lines[1].quantity).toBe(1);
    expect(o.backupHours).toBeNull();
  });

  it("leaves the panels out when there are none in the catalogue", () => {
    const [o] = buildSystems(needs, parts({ inverters: [inverter("inv", "Felicity", 400_000)], batteries: [lithium("b", "Felicity", 550_000, 5400)], panels: [] }), s);
    expect(o.lines.map((l) => l.role)).toEqual(["inverter", "battery"]);
    expect(o.totalNgn).toBe(950_000);
  });

  it("offers nothing above the site-visit limit", () => {
    const big = computeNeeds({ backupHours: 8, items: [itemFromAppliance(byId("ac-1-5hp"), 10, 6)] }, s);
    expect(tooLarge(big, s)).toBe(true);
    const huge = inverter("huge", "Deye", 5_000_000, { continuousW: 50_000, surgeW: 100_000, systemVoltage: 48 });
    expect(buildSystems(big, parts({ inverters: [huge], batteries: [lithium("b", "Deye", 1_000_000, 60_000, 51.2)] }), s)).toEqual([]);
    expect(tooLarge(needs, s)).toBe(false);
  });

  it("lists a product with no price as part of the system, and leaves it out of the total", () => {
    const [o] = buildSystems(needs, parts({ inverters: [inverter("inv", "Yohako", null)], batteries: [lithium("b", "Yohako", 550_000, 5400)] }), s);
    expect(o.lines.map((l) => [l.role, l.unitPriceNgn])).toEqual([["inverter", null], ["battery", 550_000], ["panel", 110_000]]);
    expect(o.totalNgn).toBe(550_000 + 4 * 110_000);
    expect(fullyPriced(o)).toBe(false);
  });

  it("gives a brand's fully priced pairing whenever it has one, so the customer sees a total", () => {
    const inv = inverter("inv", "Felicity", 400_000);
    const big = lithium("big", "Felicity", 2_000_000, 16_000);
    // Even when the priced battery is bigger than needed, and whichever part is missing its price.
    const battery = buildSystems(needs, parts({ inverters: [inv], batteries: [big, lithium("open", "Felicity", null, 5400)] }), s);
    expect(battery[0].lines[1].slug).toBe("big");
    const inverters = buildSystems(needs, parts({ inverters: [inv, inverter("open-inv", "Felicity", null)], batteries: [big] }), s);
    expect(inverters[0].lines[0].slug).toBe("inv");
    expect(fullyPriced(inverters[0])).toBe(true);
    // With nothing priced in full, the smallest battery that covers the need.
    const none = buildSystems(needs, parts({ inverters: [inv], batteries: [{ ...big, price: null }, lithium("open", "Felicity", null, 5400)] }), s);
    expect(none[0].lines[1].slug).toBe("open");
  });

  it("lists systems that are waiting for a price after the priced ones", () => {
    const p = parts({
      inverters: [inverter("a-inv", "Africell", null), inverter("f-inv", "Felicity", 400_000)],
      batteries: [lithium("a-b", "Africell", 100_000, 5400), lithium("f-b", "Felicity", 900_000, 5400)],
    });
    expect(ids(buildSystems(needs, p, s))).toEqual(["Felicity:separate", "Africell:separate"]);
  });

  it("survives JSON, since saved quotes store it", () => {
    const systems = buildSystems(needs, parts({ inverters: [inverter("inv", "Felicity", 400_000)], batteries: [lithium("b", "Felicity", 550_000, 5400)] }), s);
    expect(JSON.parse(JSON.stringify(systems))).toEqual(systems);
  });
});

// The sizing spec's worked example (quote JSW-JRZKHY), for the checks that need a bigger home.
const row = (name: string, quantity: number, watts: number, hoursPerDay: number, dutyCycle = 1, surge = 1): QuoteItem => ({
  name,
  watts,
  quantity,
  hoursPerDay,
  dutyCycle,
  surge,
  highDraw: false,
  onBackup: true,
});
const home = computeNeeds(
  {
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
  },
  s,
);
// The spec's illustrative inverter and 650 W panel.
const SPEC_PV: PvLimits = { maxW: 6500, maxVoc: 500, mpptMinV: 120, mpptMaxV: 450, mpptCount: 1, maxIscA: 22 };
const specInverter = (over: Partial<InverterPart> = {}) =>
  inverter("inv6k", "Felicity", 550_000, { continuousW: 6000, surgeW: 12000, systemVoltage: 48, efficiency: 0.9, idleW: 50, pv: SPEC_PV, maxChargeA: 120, ...over });
const specPanel = panel("p650", 120_000, 650, null, { voc: 44.8, vmp: 37.5, isc: 18.4 });
const li48 = (over: Partial<BatteryPart> = {}) => lithium("b15", "Felicity", 2_000_000, 15_000, 51.2, over);

describe("the sizing spec's checks", () => {
  it("wires the worked example's seven panels in one string, every check run", () => {
    const [o] = buildSystems(home, { inverters: [specInverter()], batteries: [li48()], sets: [], panels: [specPanel] }, s);
    expect(panelsOf(o)).toBe(7);
    expect(o.layout).toEqual({ strings: 1, perString: 7 });
    expect(layoutPanels(7, specPanel, SPEC_PV, s)?.checked).toBe(true);
    // A 15 kWh battery lasts about 13.1 hours, as on the spec's card.
    expect(o.backupHours).toBeCloseTo(13.1, 1);
  });

  it("never returns a layout whose cold-morning voltage is over the inverter's limit", () => {
    // At most three of these panels in series (3 × 44.8 × 1.05 = 141 V), and five strings on the input (5 × 18.4 A).
    const low: PvLimits = { ...SPEC_PV, maxVoc: 150, mpptMinV: 60, maxIscA: 100, maxW: 100_000 };
    for (let min = 1; min <= 30; min++) {
      const l = layoutPanels(min, specPanel, low, s);
      if (min <= 15) expect(l).not.toBeNull();
      if (!l) continue;
      expect(l.perString! * 44.8 * s.vocColdFactor).toBeLessThanOrEqual(150);
      expect(l.total).toBeGreaterThanOrEqual(min);
    }
    expect(layoutPanels(16, specPanel, low, s)).toBeNull();
  });

  it("rounds the panel count up when the strings need it", () => {
    // Three panels in series are below a 150 V MPPT minimum when hot (3 × 37.5 × 0.88 = 99 V); four reach it.
    const l = layoutPanels(3, specPanel, { ...SPEC_PV, mpptMinV: 130 }, s);
    expect(l).toMatchObject({ total: 4, strings: 1, perString: 4 });
  });

  it("does not offer a panel whose current is too much for the inverter's input, and takes another that fits", () => {
    // 15 A per input: a 650 W panel's 18.4 A is too much; 450 W panels at 11.6 A go one string per input, two inputs.
    const tight = specInverter({ pv: { ...SPEC_PV, maxIscA: 15, mpptCount: 2 } });
    expect(buildSystems(home, { inverters: [tight], batteries: [li48()], sets: [], panels: [specPanel] }, s)).toEqual([]);
    const small = panel("p450", 95_000, 450, null, { voc: 49.5, vmp: 41.5, isc: 11.6 });
    const [o] = buildSystems(home, { inverters: [tight], batteries: [li48()], sets: [], panels: [specPanel, small] }, s);
    expect(o.lines.at(-1)).toMatchObject({ slug: "p450", quantity: 10 });
    expect(o.layout).toEqual({ strings: 2, perString: 5 });
  });

  it("does not offer more panels than the inverter's solar input takes", () => {
    const capped = specInverter({ pv: { ...SPEC_PV, maxW: 3000 } });
    expect(buildSystems(home, { inverters: [capped], batteries: [li48()], sets: [], panels: [specPanel] }, s)).toEqual([]);
  });

  it("offers the system unchecked, for an engineer to wire, when the datasheet figures are missing", () => {
    const [o] = buildSystems(home, { inverters: [specInverter({ pv: undefined })], batteries: [li48()], sets: [], panels: [panel("p650", 120_000, 650)] }, s);
    expect(o.layout).toBeNull();
    expect(panelsOf(o)).toBe(7);
  });

  it("leaves out a battery that cannot give the current for everything at once", () => {
    // 1,925 W through a 0.9 inverter at 48 V is 44.6 A.
    expect(buildSystems(home, { inverters: [specInverter()], batteries: [li48({ maxDischargeA: 40 })], sets: [], panels: [specPanel] }, s)).toEqual([]);
    expect(buildSystems(home, { inverters: [specInverter()], batteries: [li48({ maxDischargeA: 50 })], sets: [], panels: [specPanel] }, s)).toHaveLength(1);
  });

  it("warns when the charger cannot refill the night's energy in a day of sun", () => {
    const build = (inv: InverterPart) => buildSystems(home, { inverters: [inv], batteries: [li48()], sets: [], panels: [specPanel] }, s)[0];
    // 10,992 Wh from the battery, ÷ 0.95, needs 11,570 Wh back: 120 A × 48 V × 4 h is 23,040, 50 A is 9,600.
    expect(build(specInverter()).slowRefill).toBe(false);
    expect(build(specInverter({ maxChargeA: 50 })).slowRefill).toBe(true);
    expect(build(specInverter({ maxChargeA: null })).slowRefill).toBe(false);
  });

  it("marks an inverter more than 2.5 times the need, and keeps a brand's systems within twice its smallest", () => {
    const big = specInverter({ id: "inv10k", slug: "inv10k", name: "inv10k", continuousW: 10_000, surgeW: 20_000 });
    expect(buildSystems(home, { inverters: [big], batteries: [li48()], sets: [], panels: [specPanel] }, s)[0].oversized).toBe(true);
    expect(buildSystems(home, { inverters: [specInverter()], batteries: [li48()], sets: [], panels: [specPanel] }, s)[0].oversized).toBe(false);
    // A cheap 30 kVA set is not offered next to the brand's 6 kW inverter.
    const giant = set("aio30", "Felicity", 1_000_000, { continuousW: 24_000, surgeW: 48_000, batteryWh: 60_000 });
    expect(ids(buildSystems(home, { inverters: [specInverter()], batteries: [li48()], sets: [giant], panels: [specPanel] }, s))).toEqual(["Felicity:separate"]);
  });
});

describe("pickPanel", () => {
  it("takes the cheapest panel per watt, not the cheapest panel", () => {
    expect(pickPanel([panel("p650", 120_000, 650), panel("p300", 80_000, 300)], 1377)?.id).toBe("p650");
  });

  it("skips a panel the shop has too few of", () => {
    expect(pickPanel([panel("p650", 120_000, 650, 2), panel("p300", 80_000, 300)], 1377)?.id).toBe("p300");
    expect(pickPanel([], 1377)).toBeNull();
  });

  it("prefers a priced panel, and with none priced takes the biggest", () => {
    expect(pickPanel([panel("p780", null, 780), panel("p300", 80_000, 300)], 1377)?.id).toBe("p300");
    expect(pickPanel([panel("p450", null, 450), panel("p780", null, 780)], 1377)?.id).toBe("p780");
  });
});

describe("voltageClass", () => {
  it("groups nominal and LiFePO4 voltages, and rejects high-voltage stacks", () => {
    expect([12, 12.8, 24, 25.6, 48, 51.2].map(voltageClass)).toEqual([12, 12, 24, 24, 48, 48]);
    expect(voltageClass(400)).toBeNull();
  });
});

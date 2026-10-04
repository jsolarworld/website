import { describe, expect, it } from "vitest";
import { APPLIANCES, itemFromAppliance } from "./appliances";
import { DEFAULT_SETTINGS } from "./defaults";
import { computeNeeds } from "./engine";
import { buildSystems, pickPanel, tooLarge, voltageClass, type BatteryPart, type InverterPart, type PanelPart, type Parts, type SetPart } from "./systems";
import type { QuoteInput } from "./types";

const byId = (id: string) => APPLIANCES.find((a) => a.id === id)!;
const s = DEFAULT_SETTINGS;

// PRD 7.4 flat: needs 669 W continuous, 835 W surge, 4.33 kWh lithium (6.92 tubular), 1,377 W of panels.
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

const part = (id: string, price: number) => ({ id, name: id, slug: id, price, stock: null });
const inverter = (id: string, brand: string, price: number, over: Partial<InverterPart> = {}): InverterPart => ({
  ...part(id, price),
  brand,
  continuousW: 3000,
  surgeW: 6000,
  systemVoltage: 24,
  ...over,
});
const lithium = (id: string, brand: string, price: number, wh: number, voltage = 25.6, over: Partial<BatteryPart> = {}): BatteryPart => ({
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
  batteryWh: 5000,
  ...over,
});
const panel = (id: string, price: number, watts: number, stock: number | null = null): PanelPart => ({ ...part(id, price), watts, stock });

const parts = (over: Partial<Parts>): Parts => ({ inverters: [], batteries: [], sets: [], panels: [panel("p550", 110_000, 550)], ...over });
const ids = (list: ReturnType<typeof buildSystems>) => list.map((o) => o.id);

describe("buildSystems", () => {
  it("pairs a brand's inverter with enough of its own batteries and counts the panels", () => {
    const [o] = buildSystems(needs, parts({ inverters: [inverter("inv", "Felicity", 400_000)], batteries: [lithium("b25", "Felicity", 350_000, 2560)] }), s);
    expect(o).toMatchObject({ id: "Felicity:separate", brand: "Felicity", kind: "separate", chemistry: "lithium", batteryWh: 5120 });
    expect(o.lines.map((l) => [l.role, l.quantity])).toEqual([["inverter", 1], ["battery", 2], ["panel", 3]]);
    expect(o.totalNgn).toBe(400_000 + 2 * 350_000 + 3 * 110_000);
    // 5.12 kWh at this load: a little more than the 10 hours asked for.
    expect(o.backupHours).toBeGreaterThan(10);
  });

  it("never mixes brands", () => {
    const systems = buildSystems(needs, parts({ inverters: [inverter("inv", "Felicity", 400_000)], batteries: [lithium("b", "Cworth", 300_000, 5000)] }), s);
    expect(systems).toEqual([]);
  });

  it("skips an inverter that is too small or cannot take the start-up surge", () => {
    const small = inverter("small", "Deye", 100_000, { continuousW: 600 });
    const weak = inverter("weak", "Deye", 150_000, { surgeW: 800 });
    const good = inverter("good", "Deye", 500_000);
    const [o] = buildSystems(needs, parts({ inverters: [small, weak, good], batteries: [lithium("b", "Deye", 300_000, 5000)] }), s);
    expect(o.lines[0].slug).toBe("good");
  });

  it("only uses lithium batteries at the inverter's own voltage", () => {
    const b48 = lithium("b48", "Felicity", 100_000, 5000, 51.2);
    const b24 = lithium("b24", "Felicity", 900_000, 5000, 25.6);
    const [o] = buildSystems(needs, parts({ inverters: [inverter("inv", "Felicity", 400_000)], batteries: [b48, b24] }), s);
    expect(o.lines[1].slug).toBe("b24");
  });

  it("picks the battery model that covers the need for the least money", () => {
    const two = lithium("small", "Felicity", 300_000, 2560); // 2 needed: 600,000
    const one = lithium("big", "Felicity", 550_000, 5120); // 1 needed: 550,000
    const [o] = buildSystems(needs, parts({ inverters: [inverter("inv", "Felicity", 400_000)], batteries: [two, one] }), s);
    expect(o.lines[1]).toMatchObject({ slug: "big", quantity: 1 });
  });

  it("leaves a brand out when it would take more than four battery strings", () => {
    const tiny = lithium("tiny", "Felicity", 50_000, 1000);
    expect(buildSystems(needs, parts({ inverters: [inverter("inv", "Felicity", 400_000)], batteries: [tiny] }), s)).toEqual([]);
  });

  it("wires 12 V tubular batteries in series to the inverter's voltage", () => {
    // 24 V system: strings of two 2.4 kWh blocks; 6.92 kWh needed, so two strings.
    const [o] = buildSystems(needs, parts({ inverters: [inverter("inv", "Felicity", 400_000)], batteries: [tubular("t200", "Felicity", 250_000)] }), s);
    expect(o).toMatchObject({ chemistry: "tubular", batteryWh: 9600 });
    expect(o.lines[1].quantity).toBe(4);
  });

  it("follows the battery type the customer asked for", () => {
    const p = parts({
      inverters: [inverter("inv", "Felicity", 400_000)],
      batteries: [lithium("li", "Felicity", 500_000, 5120), tubular("t200", "Felicity", 250_000)],
      sets: [set("aio", "Felicity", 2_000_000)],
    });
    expect(buildSystems(needs, p, s, "tubular").map((o) => [o.kind, o.chemistry])).toEqual([["separate", "tubular"]]);
    expect(buildSystems(needs, p, s, "lithium").map((o) => [o.kind, o.chemistry])).toEqual([
      ["separate", "lithium"],
      ["set", "lithium"],
    ]);
  });

  it("offers a brand's cheapest set that covers the inverter and battery needs", () => {
    const p = parts({
      sets: [set("thin", "Cworth", 1_000_000, { batteryWh: 3000 }), set("fit", "Cworth", 2_500_000), set("big", "Cworth", 3_000_000, { batteryWh: 16_000 })],
    });
    const [o] = buildSystems(needs, p, s);
    expect(o).toMatchObject({ id: "Cworth:set", kind: "set", batteryWh: 5000 });
    expect(o.lines[0].slug).toBe("fit");
    expect(o.totalNgn).toBe(2_500_000 + 3 * 110_000);
  });

  it("lists every brand, cheapest first, with the set and the separate pairing side by side", () => {
    const p = parts({
      inverters: [inverter("f-inv", "Felicity", 400_000), inverter("d-inv", "Deye", 900_000)],
      batteries: [lithium("f-b", "Felicity", 550_000, 5120), lithium("d-b", "Deye", 950_000, 5120)],
      sets: [set("f-set", "Felicity", 2_500_000)],
    });
    expect(ids(buildSystems(needs, p, s))).toEqual(["Felicity:separate", "Deye:separate", "Felicity:set"]);
  });

  it("respects stock, and treats on-request items as available", () => {
    const one = lithium("b", "Felicity", 300_000, 2560, 25.6, { stock: 1 });
    const inv = inverter("inv", "Felicity", 400_000);
    expect(buildSystems(needs, parts({ inverters: [inv], batteries: [one] }), s)).toEqual([]);
    expect(buildSystems(needs, parts({ inverters: [inv], batteries: [{ ...one, stock: 2 }] }), s)).toHaveLength(1);
    expect(buildSystems(needs, parts({ inverters: [{ ...inv, stock: 0 }], batteries: [{ ...one, stock: null }] }), s)).toEqual([]);
  });

  it("still includes one battery when nothing runs on backup", () => {
    const none = computeNeeds({ backupHours: 8, items: [itemFromAppliance(byId("electric-kettle"), 1, 0.25)] }, s);
    const [o] = buildSystems(none, parts({ inverters: [inverter("inv", "Felicity", 400_000)], batteries: [lithium("b", "Felicity", 300_000, 2560)] }), s);
    expect(o.lines[1].quantity).toBe(1);
    expect(o.backupHours).toBeNull();
  });

  it("leaves the panels out of the total when no panel is priced", () => {
    const [o] = buildSystems(needs, parts({ inverters: [inverter("inv", "Felicity", 400_000)], batteries: [lithium("b", "Felicity", 550_000, 5120)], panels: [] }), s);
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

  it("survives JSON, since saved quotes store it", () => {
    const systems = buildSystems(needs, parts({ inverters: [inverter("inv", "Felicity", 400_000)], batteries: [lithium("b", "Felicity", 550_000, 5120)] }), s);
    expect(JSON.parse(JSON.stringify(systems))).toEqual(systems);
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
});

describe("voltageClass", () => {
  it("groups nominal and LiFePO4 voltages, and rejects high-voltage stacks", () => {
    expect([12, 12.8, 24, 25.6, 48, 51.2].map(voltageClass)).toEqual([12, 12, 24, 24, 48, 48]);
    expect(voltageClass(400)).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { toParts, type PartRow } from "./parts";

const row = (over: Partial<PartRow>): PartRow => ({
  id: "p1",
  name: "Felicity 6kVA Hybrid Inverter 48V",
  slug: "felicity-6kva",
  price: 900_000,
  stock: 0,
  availableOnRequest: true,
  brandId: "b-felicity",
  brandName: "Felicity",
  categorySlug: "inverters",
  specs: { ratedKva: 6, ratedContinuousW: 6000, surgeW: 12000, systemVoltage: 48, type: "Hybrid" },
  ...over,
});

describe("toParts", () => {
  it("reads an inverter's ratings and treats on-request stock as unlimited", () => {
    const { inverters } = toParts([row({})]);
    expect(inverters).toEqual([{ id: "p1", name: "Felicity 6kVA Hybrid Inverter 48V", slug: "felicity-6kva", price: 900_000, stock: null, brand: "Felicity", continuousW: 6000, surgeW: 12000, systemVoltage: 48 }]);
    expect(toParts([row({ availableOnRequest: false, stock: 3 })]).inverters[0].stock).toBe(3);
  });

  it("leaves out a product that is missing a rating or a brand, instead of guessing", () => {
    expect(toParts([row({ specs: { ratedKva: 6, systemVoltage: 48 } })]).inverters).toEqual([]);
    expect(toParts([row({ brandId: null, brandName: null })]).inverters).toEqual([]);
  });

  it("never offers three-phase or high-voltage equipment automatically", () => {
    expect(toParts([row({ name: "Deye 20kVA Three-Phase Hybrid Inverter" })]).inverters).toEqual([]);
    expect(toParts([row({ specs: { ratedContinuousW: 30000, surgeW: 45000, systemVoltage: 400, type: "Hybrid, high voltage" } })]).inverters).toEqual([]);
  });

  it("works out a lithium battery's energy from kWh, or from Ah and voltage", () => {
    const battery = (specs: object) => toParts([row({ categorySlug: "lithium-batteries", specs })]).batteries[0];
    expect(battery({ capacityKwh: 10, voltage: 51.2 })).toMatchObject({ chemistry: "lithium", wh: 10_000, voltage: 51.2 });
    expect(battery({ capacityAh: 100, voltage: 12 })).toMatchObject({ wh: 1200, voltage: 12 });
  });

  it("sizes tubular and drycell batteries from Ah and voltage, as lead-acid", () => {
    for (const categorySlug of ["tubular-batteries", "drycell-batteries"]) {
      const [b] = toParts([row({ categorySlug, specs: { capacityAh: 200, voltage: 12 } })]).batteries;
      expect(b).toMatchObject({ chemistry: "tubular", wh: 2400 });
    }
  });

  it("reads a set's inverter and battery together", () => {
    const [s] = toParts([row({ categorySlug: "inverter-and-battery-sets", specs: { ratedContinuousW: 8000, surgeW: 16000, batteryKwh: 10 } })]).sets;
    expect(s).toMatchObject({ brand: "Felicity", continuousW: 8000, surgeW: 16000, batteryWh: 10_000 });
  });

  it("takes panels with or without a brand", () => {
    const [p] = toParts([row({ categorySlug: "solar-panels", brandId: null, brandName: null, specs: { watts: 650 } })]).panels;
    expect(p).toMatchObject({ watts: 650, price: 900_000 });
  });

  it("accepts a rating stored as text, and drops one that is not a number", () => {
    expect(toParts([row({ categorySlug: "solar-panels", specs: { watts: "650" } })]).panels[0].watts).toBe(650);
    expect(toParts([row({ categorySlug: "solar-panels", specs: { watts: "about 650" } })]).panels).toEqual([]);
  });

  it("ignores categories the quote tool does not read", () => {
    const parts = toParts([row({ categorySlug: "solar-street-lights", specs: { watts: 80 } })]);
    expect(parts).toEqual({ inverters: [], batteries: [], sets: [], panels: [] });
  });
});

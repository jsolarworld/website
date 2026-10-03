import { describe, expect, it } from "vitest";
import { isMissingFilter, lacksQuoteDetails, missingDetails, quoteSpecKeys, type MissingInput } from "./missing";
import type { SpecField } from "./product-form";

const INVERTER: SpecField[] = [
  { key: "ratedKva", label: "Rating", unit: "kVA" },
  { key: "ratedContinuousW", label: "Rated continuous power", unit: "W" },
  { key: "surgeW", label: "Surge power", unit: "W" },
  { key: "systemVoltage", label: "System voltage", unit: "V" },
  { key: "type", label: "Type" },
];
const LITHIUM: SpecField[] = [
  { key: "capacityKwh", label: "Capacity", unit: "kWh" },
  { key: "voltage", label: "Voltage", unit: "V" },
  { key: "capacityAh", label: "Capacity", unit: "Ah" },
];

const product = (over: Partial<MissingInput>): MissingInput => ({
  kind: "PRODUCT",
  priceNgn: 1_000_000,
  brandId: "felicity",
  mediaCount: 1,
  categorySlug: "inverters",
  specTemplate: INVERTER,
  specs: { ratedContinuousW: 6000, surgeW: 12000, systemVoltage: 48 },
  ...over,
});

describe("missingDetails", () => {
  it("finds nothing on a complete inverter", () => {
    expect(missingDetails(product({}))).toEqual([]);
    expect(lacksQuoteDetails(product({}))).toBe(false);
  });

  it("lists price and photo first, then the ratings the quote tool reads", () => {
    const p = product({ priceNgn: null, mediaCount: 0, specs: { ratedKva: 6, type: "Hybrid" } });
    expect(missingDetails(p)).toEqual(["price", "photo", "rated continuous power (W)", "surge power (W)", "system voltage (V)"]);
  });

  it("does not count a missing photo against the quote tool", () => {
    expect(lacksQuoteDetails(product({ mediaCount: 0 }))).toBe(false);
  });

  it("needs a price and a brand before an inverter can be quoted", () => {
    expect(lacksQuoteDetails(product({ priceNgn: null }))).toBe(true);
    expect(missingDetails(product({ brandId: null }))).toEqual(["brand"]);
  });

  it("treats an empty or zero rating as missing", () => {
    expect(missingDetails(product({ specs: { ratedContinuousW: 0, surgeW: "", systemVoltage: 48 } }))).toEqual(["rated continuous power (W)", "surge power (W)"]);
  });

  it("accepts a lithium battery's capacity in kWh or in Ah", () => {
    const battery = (specs: object) => product({ categorySlug: "lithium-batteries", specTemplate: LITHIUM, specs });
    expect(missingDetails(battery({ capacityAh: 100, voltage: 12 }))).toEqual([]);
    expect(missingDetails(battery({ capacityKwh: 10, voltage: 51.2 }))).toEqual([]);
    expect(missingDetails(battery({ voltage: 48 }))).toEqual(["capacity (kWh or Ah)"]);
  });

  it("does not need a brand on a solar panel", () => {
    const panel = product({ categorySlug: "solar-panels", specTemplate: [{ key: "watts", label: "Power", unit: "W" }], brandId: null, specs: {} });
    expect(missingDetails(panel)).toEqual(["power (W)"]);
  });

  it("only asks for price and photo on products the quote tool does not read", () => {
    const light = product({ categorySlug: "solar-street-lights", specTemplate: [], brandId: null, specs: {}, priceNgn: null });
    expect(missingDetails(light)).toEqual(["price"]);
    expect(lacksQuoteDetails(light)).toBe(false);
  });

  it("leaves packages to their own sizing fields", () => {
    expect(lacksQuoteDetails(product({ kind: "PACKAGE", specs: {} }))).toBe(false);
  });

  it("copes with specs that are not an object", () => {
    expect(missingDetails(product({ specs: null }))).toHaveLength(3);
  });
});

describe("helpers", () => {
  it("lists the spec keys the quote tool reads", () => {
    expect(quoteSpecKeys("lithium-batteries")).toEqual(["capacityKwh", "capacityAh", "voltage"]);
    expect(quoteSpecKeys("accessories")).toEqual([]);
    expect(quoteSpecKeys("toString")).toEqual([]);
  });

  it("accepts only known filter names", () => {
    expect(isMissingFilter("price")).toBe(true);
    expect(isMissingFilter("constructor")).toBe(false);
    expect(isMissingFilter(undefined)).toBe(false);
  });
});

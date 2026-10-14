import { describe, expect, it } from "vitest";
import { ACCESSORY_KINDS, pickAccessories, type AccessoryRow } from "./accessories";

const row = (name: string, price: number | null, type = ""): AccessoryRow => ({ name, slug: name.toLowerCase().replace(/\W+/g, "-"), price, type });
const pick = (rows: AccessoryRow[], key: string) => pickAccessories(rows).find((l) => l.key === key)!.product;

describe("pickAccessories", () => {
  it("lists every kind, with no product while the shop has none", () => {
    const lines = pickAccessories([]);
    expect(lines.map((l) => l.key)).toEqual(ACCESSORY_KINDS.map((k) => k.key));
    expect(lines.every((l) => l.product === null)).toBe(true);
  });

  it("finds a product by its type or its name", () => {
    expect(pick([row("Kaiser 40kA unit", 25_000, "Surge protector")], "surge-protector")?.name).toBe("Kaiser 40kA unit");
    expect(pick([row("Solar Cable 6mm (100 m roll)", 90_000)], "solar-cable")?.priceNgn).toBe(90_000);
  });

  it("quotes the cheapest priced product, and one without a price only when none has one", () => {
    const rows = [row("MC4 Connector Pair B", 2_500), row("MC4 Connector Pair A", 1_500), row("MC4 Connector Pair C", null)];
    expect(pick(rows, "mc4")?.name).toBe("MC4 Connector Pair A");
    expect(pick([row("MC4 Connector Pair C", null)], "mc4")).toEqual({ name: "MC4 Connector Pair C", slug: "mc4-connector-pair-c", priceNgn: null });
  });

  it("tells DC breakers from AC breakers", () => {
    const rows = [row("63A DC Breaker", 12_000), row("AC Breaker 40A", 8_000)];
    expect(pick(rows, "dc-breaker")?.name).toBe("63A DC Breaker");
    expect(pick(rows, "ac-breaker")?.name).toBe("AC Breaker 40A");
  });

  it("does not take a wall-mounted surge protector for a mounting kit, or an earth leakage breaker for earthing", () => {
    const rows = [row("Wall-Mounted SPD 40kA", 30_000), row("Earth Leakage Breaker 63A", 15_000)];
    expect(pick(rows, "surge-protector")?.name).toBe("Wall-Mounted SPD 40kA");
    expect(pick(rows, "mounting")).toBeNull();
    expect(pick(rows, "earthing")).toBeNull();
    expect(pick([row("Panel Mounting Kit (4 panels)", 45_000)], "mounting")?.name).toBe("Panel Mounting Kit (4 panels)");
    expect(pick([row("Copper Earth Rod 1.2m", 9_000)], "earthing")?.name).toBe("Copper Earth Rod 1.2m");
  });

  it("leaves out products that are none of the kinds", () => {
    expect(pickAccessories([row("DAS Power Smart Solar Security Camera", 60_000, "Solar security camera")]).every((l) => l.product === null)).toBe(true);
  });
});

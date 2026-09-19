import { describe, expect, it } from "vitest";
import { slugify, uniqueSlug } from "./slug";

describe("slugify", () => {
  it.each([
    ["12kVA Felicity Inverter (48V)", "12kva-felicity-inverter-48v"],
    ["  Lithium & Tubular  ", "lithium-and-tubular"],
    ["Café Solar", "cafe-solar"],
    ["--x--", "x"],
    ["", ""],
  ])("%s -> %s", (input, out) => {
    expect(slugify(input)).toBe(out);
  });

  it("caps length without leaving a trailing hyphen", () => {
    const s = slugify("a".repeat(79) + " bbb");
    expect(s.length).toBeLessThanOrEqual(80);
    expect(s.endsWith("-")).toBe(false);
  });
});

describe("uniqueSlug", () => {
  it("returns the base when free and counts up when taken", () => {
    expect(uniqueSlug("inv", new Set())).toBe("inv");
    expect(uniqueSlug("inv", new Set(["inv"]))).toBe("inv-2");
    expect(uniqueSlug("inv", new Set(["inv", "inv-2"]))).toBe("inv-3");
    expect(uniqueSlug("", new Set())).toBe("item");
  });
});

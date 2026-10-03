import { describe, expect, it } from "vitest";
import { PLACEHOLDER_GRID, PLACEHOLDER_TONES, placeholderArt } from "./placeholder";

describe("placeholderArt", () => {
  it("draws the same picture for the same product every time", () => {
    expect(placeholderArt("Cworth 12V 100Ah Lithium Battery")).toEqual(placeholderArt("Cworth 12V 100Ah Lithium Battery"));
  });

  it("fills the whole grid with known tones", () => {
    for (const seed of ["", "a", "Felicity 6kVA Hybrid Inverter 48V", "Ω ₦ 780W"]) {
      const { tones } = placeholderArt(seed);
      expect(tones).toHaveLength(PLACEHOLDER_GRID * PLACEHOLDER_GRID);
      expect(tones.every((t) => Number.isInteger(t) && t >= 0 && t < PLACEHOLDER_TONES)).toBe(true);
    }
  });

  it("keeps the warm light next to the sun and the deep shade in the far corner", () => {
    for (const seed of ["one", "two", "three", "four", "five", "six"]) {
      const { sun, tones } = placeholderArt(seed);
      const sunCorner = sun === "left" ? 0 : PLACEHOLDER_GRID - 1;
      const farCorner = PLACEHOLDER_GRID * PLACEHOLDER_GRID - 1 - sunCorner;
      expect(tones[sunCorner]).toBeLessThanOrEqual(1);
      expect(tones[farCorner]).toBe(PLACEHOLDER_TONES - 1);
    }
  });

  it("varies between products", () => {
    const names = Array.from({ length: 40 }, (_, i) => `Product ${i}`);
    const pictures = new Set(names.map((n) => JSON.stringify(placeholderArt(n))));
    expect(pictures.size).toBeGreaterThan(30);
    expect(new Set(names.map((n) => placeholderArt(n).sun)).size).toBe(2);
  });
});

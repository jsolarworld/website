import { describe, expect, it, vi } from "vitest";

// catalogue.ts also holds the storefront queries; only its pure rules are exercised here.
vi.mock("./db", () => ({ db: {} }));

describe("catalogue rules", async () => {
  const { canBuyOnline, effectivePrice } = await import("./catalogue");

  describe("effectivePrice", () => {
    it("is the sale price when there is one, else the normal price", () => {
      expect(effectivePrice({ priceNgn: 1_000_000, salePriceNgn: null })).toBe(1_000_000);
      expect(effectivePrice({ priceNgn: 1_000_000, salePriceNgn: 900_000 })).toBe(900_000);
    });

    it("is null when no price has been set, even if a sale price was left behind", () => {
      expect(effectivePrice({ priceNgn: null, salePriceNgn: null })).toBeNull();
      expect(effectivePrice({ priceNgn: null, salePriceNgn: 900_000 })).toBeNull();
    });
  });

  describe("canBuyOnline", () => {
    const inStock = { priceNgn: 550_000, stock: 3, availableOnRequest: false };

    it("needs a price, stock on the shelf and not being 'on request'", () => {
      expect(canBuyOnline(inStock)).toBe(true);
      expect(canBuyOnline({ ...inStock, priceNgn: null })).toBe(false);
      expect(canBuyOnline({ ...inStock, stock: 0 })).toBe(false);
      expect(canBuyOnline({ ...inStock, availableOnRequest: true })).toBe(false);
    });

    it("checks the quantity asked for", () => {
      expect(canBuyOnline(inStock, 3)).toBe(true);
      expect(canBuyOnline(inStock, 4)).toBe(false);
    });
  });
});

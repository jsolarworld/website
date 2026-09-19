import { describe, expect, it } from "vitest";
import { adjustPrice } from "./pricing";

describe("adjustPrice", () => {
  it("raises by a percentage", () => {
    expect(adjustPrice(1_000_000, { mode: "percent", value: 7.5, round: 0 })).toBe(1_075_000);
  });

  it("lowers by a percentage", () => {
    expect(adjustPrice(200_000, { mode: "percent", value: -10, round: 0 })).toBe(180_000);
  });

  it("adds or subtracts a fixed amount", () => {
    expect(adjustPrice(50_000, { mode: "amount", value: 5_000, round: 0 })).toBe(55_000);
    expect(adjustPrice(50_000, { mode: "amount", value: -5_000, round: 0 })).toBe(45_000);
  });

  it("rounds to the nearest 500 or 1000", () => {
    expect(adjustPrice(123_456, { mode: "percent", value: 0, round: 500 })).toBe(123_500);
    expect(adjustPrice(123_456, { mode: "percent", value: 0, round: 1000 })).toBe(123_000);
  });

  it("returns whole naira", () => {
    expect(Number.isInteger(adjustPrice(999, { mode: "percent", value: 3.3, round: 0 })!)).toBe(true);
  });

  it("refuses a result that is zero, negative or not a number", () => {
    expect(adjustPrice(1_000, { mode: "percent", value: -100, round: 0 })).toBeNull();
    expect(adjustPrice(1_000, { mode: "amount", value: -5_000, round: 0 })).toBeNull();
    expect(adjustPrice(1_000, { mode: "percent", value: NaN, round: 0 })).toBeNull();
  });
});

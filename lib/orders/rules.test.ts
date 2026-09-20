import { randomInt } from "node:crypto";
import { describe, expect, it } from "vitest";
import { addLine, cartCount, parseCart, removeLine, serializeCart, setQuantity } from "./cart";
import { evaluateVerification } from "./paystack";
import { canTransition, makeOrderNumber, nextStatuses, normalizeOrderNumber, orderToken, orderTotals, toKobo, verifyOrderToken } from "./rules";

describe("cart", () => {
  it("round-trips and ignores hostile input", () => {
    const lines = [{ productId: "p1", quantity: 2 }, { productId: "p2", quantity: 1 }];
    expect(parseCart(serializeCart(lines))).toEqual(lines);
    expect(parseCart("not json")).toEqual([]);
    expect(parseCart('{"a":1}')).toEqual([]);
    expect(parseCart(undefined)).toEqual([]);
    expect(parseCart(JSON.stringify([["p", -1], ["q", 1.5], [5, 1], ["ok", 3], ["ok", 9]]))).toEqual([{ productId: "ok", quantity: 3 }]);
  });

  it("caps quantity and line count", () => {
    expect(parseCart(JSON.stringify([["p", 5000]]))[0].quantity).toBe(99);
    const many = Array.from({ length: 80 }, (_, i) => [`p${i}`, 1]);
    expect(parseCart(JSON.stringify(many))).toHaveLength(30);
  });

  it("adds, merges, sets and removes lines", () => {
    let c = addLine([], "a", 1);
    c = addLine(c, "a", 2);
    c = addLine(c, "b", 1);
    expect(c).toEqual([{ productId: "a", quantity: 3 }, { productId: "b", quantity: 1 }]);
    expect(cartCount(c)).toBe(4);
    expect(setQuantity(c, "a", 5)[0].quantity).toBe(5);
    expect(setQuantity(c, "a", 0)).toHaveLength(1);
    expect(removeLine(c, "b")).toHaveLength(1);
  });
});

describe("money", () => {
  it("converts naira to kobo exactly", () => {
    expect(toKobo(1_000_000)).toBe(100_000_000);
    expect(toKobo(1)).toBe(100);
  });

  it("totals lines from database prices", () => {
    expect(orderTotals([{ unitPriceNgn: 1_000_000, quantity: 1 }, { unitPriceNgn: 25_000, quantity: 4 }])).toEqual({
      subtotalNgn: 1_100_000,
      deliveryFeeNgn: 0,
      taxNgn: 0,
      totalNgn: 1_100_000,
    });
    expect(orderTotals([{ unitPriceNgn: 100, quantity: 2 }], 500, 0).totalNgn).toBe(700);
  });
});

describe("order numbers and tokens", () => {
  it("makes readable, unambiguous numbers", () => {
    for (let i = 0; i < 100; i++) expect(makeOrderNumber(randomInt)).toMatch(/^JSW-[2-9A-HJKMNP-Z]{7}$/);
  });

  it("normalises typed numbers", () => {
    expect(normalizeOrderNumber("  jsw-ab c2345 ")).toBe("JSW-ABC2345");
  });

  it("accepts only the right token for the right order", () => {
    const t = orderToken("JSW-AAAAAAA", "secret");
    expect(verifyOrderToken("JSW-AAAAAAA", t, "secret")).toBe(true);
    expect(verifyOrderToken("JSW-BBBBBBB", t, "secret")).toBe(false);
    expect(verifyOrderToken("JSW-AAAAAAA", t, "other-secret")).toBe(false);
    expect(verifyOrderToken("JSW-AAAAAAA", "", "secret")).toBe(false);
    expect(verifyOrderToken("JSW-AAAAAAA", undefined, "secret")).toBe(false);
    expect(verifyOrderToken("JSW-AAAAAAA", t.slice(0, -1), "secret")).toBe(false);
  });
});

describe("status machine", () => {
  it("only lets an unpaid order be cancelled, never marked paid by hand", () => {
    expect(nextStatuses("PENDING_PAYMENT")).toEqual(["CANCELLED"]);
    expect(canTransition("PENDING_PAYMENT", "PAID")).toBe(false);
  });

  it("follows the fulfilment path and locks final states", () => {
    expect(canTransition("PAID", "PROCESSING")).toBe(true);
    expect(canTransition("PROCESSING", "OUT_FOR_DELIVERY")).toBe(true);
    expect(canTransition("READY_FOR_PICKUP", "COMPLETED")).toBe(true);
    expect(canTransition("COMPLETED", "PROCESSING")).toBe(false);
    expect(nextStatuses("CANCELLED")).toEqual([]);
    expect(nextStatuses("REFUNDED")).toEqual([]);
  });
});

describe("evaluateVerification", () => {
  const expected = { reference: "REF1", amountNgn: 1_000_000 };
  const ok = { status: "success", reference: "REF1", amount: 100_000_000, currency: "NGN" };

  it("accepts an exact successful payment", () => {
    expect(evaluateVerification(expected, ok)).toEqual({ kind: "success" });
  });

  it("rejects the wrong amount in either direction", () => {
    expect(evaluateVerification(expected, { ...ok, amount: 100_000 }).kind).toBe("failed");
    expect(evaluateVerification(expected, { ...ok, amount: 200_000_000 }).kind).toBe("failed");
  });

  it("rejects a different reference or currency", () => {
    expect(evaluateVerification(expected, { ...ok, reference: "OTHER" }).kind).toBe("failed");
    expect(evaluateVerification(expected, { ...ok, currency: "USD" }).kind).toBe("failed");
  });

  it("treats abandoned and ongoing payments as pending, and failures as failed", () => {
    expect(evaluateVerification(expected, { ...ok, status: "abandoned" }).kind).toBe("pending");
    expect(evaluateVerification(expected, { ...ok, status: "ongoing" }).kind).toBe("pending");
    expect(evaluateVerification(expected, { ...ok, status: "failed" }).kind).toBe("failed");
    expect(evaluateVerification(expected, null).kind).toBe("pending");
  });
});

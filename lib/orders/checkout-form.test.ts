import { describe, expect, it } from "vitest";
import { parseCheckoutForm } from "./checkout-form";

function form(fields: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}
const pickup = { fullName: "Ada Obi", phone: "0803 123 4567", email: "Ada@Example.com", fulfilment: "PICKUP", method: "BANK_TRANSFER", terms: "on" };

describe("parseCheckoutForm", () => {
  it("accepts a pickup order and normalises phone and email", () => {
    const r = parseCheckoutForm(form(pickup));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.phone).toBe("+2348031234567");
      expect(r.data.email).toBe("ada@example.com");
      expect(r.data.deliveryAddress).toBeNull();
    }
  });

  it("requires an address for delivery", () => {
    const r = parseCheckoutForm(form({ ...pickup, fulfilment: "LAGOS_DELIVERY" }));
    expect(!r.ok && Object.keys(r.errors)).toEqual(expect.arrayContaining(["deliveryState", "deliveryArea", "deliveryAddress"]));
    const ok = parseCheckoutForm(form({ ...pickup, fulfilment: "INTERSTATE_DELIVERY", deliveryState: "Abia", deliveryArea: "Aba", deliveryAddress: "12 Market Road" }));
    expect(ok.ok).toBe(true);
  });

  it("requires terms, a payment method, a real phone and an email", () => {
    expect(parseCheckoutForm(form({ ...pickup, terms: "" })).ok).toBe(false);
    expect(parseCheckoutForm(form({ ...pickup, method: "CASH" })).ok).toBe(false);
    expect(parseCheckoutForm(form({ ...pickup, phone: "123" })).ok).toBe(false);
    expect(parseCheckoutForm(form({ ...pickup, email: "nope" })).ok).toBe(false);
    expect(parseCheckoutForm(form({ ...pickup, fullName: "Al" })).ok).toBe(false);
  });

  it("treats an unknown fulfilment as pickup rather than trusting it", () => {
    const r = parseCheckoutForm(form({ ...pickup, fulfilment: "DRONE" }));
    expect(r.ok && r.data.fulfilment).toBe("PICKUP");
  });
});

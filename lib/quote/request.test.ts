import { describe, expect, it } from "vitest";
import { parseContact, parseQuoteRequest } from "./request";

const item = { name: "Fan", watts: 75, quantity: 2, hoursPerDay: 8, dutyCycle: 1, surge: 1, highDraw: false, onBackup: true };
const base = { items: [item], backupHours: 8 };

describe("parseQuoteRequest", () => {
  it("accepts a valid request", () => {
    const r = parseQuoteRequest({ ...base, chemistry: "lithium", budgetNgn: 2_000_000, state: "Lagos" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.chemistry).toBe("lithium");
  });

  it.each([
    ["not an object", null],
    ["no items", { ...base, items: [] }],
    ["too many items", { ...base, items: Array(41).fill(item) }],
    ["absurd watts", { ...base, items: [{ ...item, watts: 1e9 }] }],
    ["negative quantity", { ...base, items: [{ ...item, quantity: -1 }] }],
    ["hours over 24", { ...base, items: [{ ...item, hoursPerDay: 30 }] }],
    ["NaN watts", { ...base, items: [{ ...item, watts: NaN }] }],
    ["bad backup hours", { ...base, backupHours: 0 }],
    ["backup longer than a day", { ...base, backupHours: 30 }],
    ["nothing left on the system", { ...base, items: [{ ...item, highDraw: true, onBackup: false }] }],
  ])("rejects %s", (_name, raw) => {
    expect(parseQuoteRequest(raw).ok).toBe(false);
  });

  it("drops an unknown chemistry instead of trusting it", () => {
    const r = parseQuoteRequest({ ...base, chemistry: "nuclear" });
    expect(r.ok && r.data.chemistry).toBeUndefined();
  });

  it("keeps a known usage time and counts anything else as night", () => {
    const r = parseQuoteRequest({ ...base, items: [{ ...item, usageTime: "day" }, { ...item, usageTime: "noon" }, item] });
    expect(r.ok && r.data.input.items.map((i) => i.usageTime)).toEqual(["day", "night", "night"]);
  });

  it("does not let extra fields through", () => {
    const r = parseQuoteRequest({ ...base, items: [{ ...item, price: 1 }] });
    expect(r.ok && Object.keys(r.data.input.items[0])).not.toContain("price");
  });
});

describe("parseContact", () => {
  it("normalises the phone and requires consent", () => {
    const r = parseContact({ phone: "0810 036 2453", consent: true });
    expect(r.ok && r.data.phone).toBe("+2348100362453");
    expect(parseContact({ phone: "08100362453", consent: false }).ok).toBe(false);
  });

  it("rejects bad phone and bad email", () => {
    expect(parseContact({ phone: "123", consent: true }).ok).toBe(false);
    expect(parseContact({ phone: "08100362453", email: "nope", consent: true }).ok).toBe(false);
  });
});

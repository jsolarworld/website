import { describe, expect, it } from "vitest";
import { MAX_DAYS_AHEAD, lagosToday, parseBooking } from "./bookings";

// 10:00 in Lagos on 4 October 2026.
const now = new Date("2026-10-04T09:00:00Z");
const valid = {
  serviceId: "svc-install",
  name: "Ade Bello",
  phone: "0803 123 4567",
  email: "",
  state: "Lagos",
  area: "Ojo",
  address: "12 Example Street, Ojo",
  preferredDate: "2026-10-10",
  timeWindow: "Morning (8am to 12pm)",
  notes: "3-bedroom flat",
};
const form = (over: Record<string, string> = {}) => {
  const f: Record<string, string> = { ...valid, ...over };
  return { get: (k: string) => f[k] ?? null };
};
const parse = (over: Record<string, string> = {}) => parseBooking(form(over), ["svc-install", "svc-inspect"], now);

describe("parseBooking", () => {
  it("accepts a complete booking and pins the date to noon in Lagos", () => {
    const r = parse();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toMatchObject({ serviceId: "svc-install", phone: "+2348031234567", email: null, state: "Lagos", timeWindow: "Morning (8am to 12pm)" });
    expect(r.data.preferredDate?.toISOString()).toBe("2026-10-10T11:00:00.000Z");
  });

  it("lets the date, time, email and notes be left out", () => {
    const r = parse({ preferredDate: "", timeWindow: "", notes: "" });
    expect(r.ok && [r.data.preferredDate, r.data.timeWindow, r.data.notes]).toEqual([null, null, null]);
  });

  it("refuses a service that is not offered, a bad phone and an unknown state", () => {
    const r = parse({ serviceId: "svc-hidden", phone: "123", state: "Atlantis" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["phone", "serviceId", "state"]);
  });

  it("refuses a date in the past or too far ahead, but accepts today", () => {
    expect(parse({ preferredDate: "2026-10-03" }).ok).toBe(false);
    expect(parse({ preferredDate: "2026-10-04" }).ok).toBe(true);
    const far = lagosToday(new Date(now.getTime() + (MAX_DAYS_AHEAD + 2) * 24 * 60 * 60 * 1000));
    expect(parse({ preferredDate: far }).ok).toBe(false);
  });

  it("works out today in Lagos, not in UTC", () => {
    // 23:30 UTC on 3 October is already 00:30 on 4 October in Lagos.
    expect(lagosToday(new Date("2026-10-03T23:30:00Z"))).toBe("2026-10-04");
  });

  it("refuses a time window it does not know and a malformed email", () => {
    const r = parse({ timeWindow: "Midnight", email: "ade@" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["email", "timeWindow"]);
  });
});

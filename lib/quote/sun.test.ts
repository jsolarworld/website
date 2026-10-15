import { describe, expect, it } from "vitest";
import { NIGERIAN_STATES, sunHoursFor } from "./sun";

describe("sunHoursFor", () => {
  it("gives each region's figure", () => {
    expect([sunHoursFor("Lagos", 4), sunHoursFor("Kwara", 4), sunHoursFor("Kano", 4)]).toEqual([4, 5, 5.5]);
  });

  it("reads a state the way customers type it", () => {
    expect(sunHoursFor("lagos state", 4)).toBe(4);
    expect(sunHoursFor("Akwa-Ibom", 3)).toBe(4);
    expect(sunHoursFor("Abuja", 4)).toBe(5);
    expect(sunHoursFor("FCT", 4)).toBe(5);
    expect(sunHoursFor("FCT (Abuja)", 4)).toBe(5);
  });

  it("falls back for an empty or unknown state", () => {
    expect(sunHoursFor(undefined, 4)).toBe(4);
    expect(sunHoursFor("", 4)).toBe(4);
    expect(sunHoursFor("Accra", 4)).toBe(4);
  });

  it("lists all 36 states and the FCT once each", () => {
    expect(NIGERIAN_STATES).toHaveLength(37);
    expect(new Set(NIGERIAN_STATES.map((s) => s.name)).size).toBe(37);
  });
});

import { describe, expect, it } from "vitest";
import { APPLIANCES, DEFAULT_HOURS, itemFromAppliance } from "./appliances";

const byId = (id: string) => APPLIANCES.find((a) => a.id === id)!;

describe("appliance library", () => {
  it("has a unique id for every appliance", () => {
    expect(new Set(APPLIANCES.map((a) => a.id)).size).toBe(APPLIANCES.length);
  });

  it("only sets default hours for appliances in the library, within one day", () => {
    for (const [id, hours] of Object.entries(DEFAULT_HOURS)) {
      expect(byId(id), id).toBeDefined();
      expect(hours).toBeGreaterThan(0);
      expect(hours).toBeLessThanOrEqual(24);
    }
  });

  it("uses ratings the engine can work with", () => {
    for (const a of APPLIANCES) {
      expect(a.watts, a.id).toBeGreaterThan(0);
      expect(a.dutyCycle, a.id).toBeGreaterThan(0);
      expect(a.dutyCycle, a.id).toBeLessThanOrEqual(1);
      expect(a.surge, a.id).toBeGreaterThanOrEqual(1);
    }
  });

  it("starts big pumps and the shower heater off battery backup", () => {
    for (const id of ["water-pump-1hp", "water-pump-1-5hp", "instant-shower-heater"]) {
      expect(itemFromAppliance(byId(id), 1, 1).onBackup, id).toBe(false);
    }
  });

  it("gives inverter air conditioners no start-up surge, unlike the older kind", () => {
    expect(byId("ac-1hp-inverter").surge).toBe(1);
    expect(byId("ac-1hp").surge).toBeGreaterThan(1);
  });
});

import { randomInt } from "node:crypto";
import { describe, expect, it } from "vitest";
import { makeTemporaryPassword, refuseAccessChange } from "./staff-rules";

const base = { actorId: "a", targetId: "b", targetRole: "STORE_MANAGER" as const, newRole: "SALES_REP" as const, ownerCount: 2 };

describe("refuseAccessChange", () => {
  it("allows an owner to change someone else's role", () => {
    expect(refuseAccessChange(base)).toBeNull();
  });

  it("refuses changing your own access, including promotion", () => {
    expect(refuseAccessChange({ ...base, targetId: "a" })).toMatch(/own access/);
    expect(refuseAccessChange({ ...base, targetId: "a", newRole: "REMOVED" })).toMatch(/own access/);
  });

  it("refuses removing or demoting the last owner", () => {
    expect(refuseAccessChange({ ...base, targetRole: "OWNER", newRole: "REMOVED", ownerCount: 1 })).toMatch(/at least one owner/);
    expect(refuseAccessChange({ ...base, targetRole: "OWNER", newRole: "SALES_REP", ownerCount: 1 })).toMatch(/at least one owner/);
  });

  it("allows demoting an owner when another owner remains", () => {
    expect(refuseAccessChange({ ...base, targetRole: "OWNER", newRole: "SALES_REP", ownerCount: 2 })).toBeNull();
  });
});

describe("makeTemporaryPassword", () => {
  it("is 12 characters with no look-alike characters", () => {
    for (let i = 0; i < 50; i++) {
      const p = makeTemporaryPassword(randomInt);
      expect(p).toHaveLength(12);
      expect(p).not.toMatch(/[0OIl1]/);
    }
  });

  it("differs between calls", () => {
    expect(makeTemporaryPassword(randomInt)).not.toBe(makeTemporaryPassword(randomInt));
  });
});

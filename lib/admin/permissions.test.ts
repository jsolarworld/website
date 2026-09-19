import { describe, expect, it } from "vitest";
import { STAFF_ROLES, can, isStaffRole } from "./permissions";

describe("permissions", () => {
  it("owner can do everything", () => {
    for (const p of ["staff:manage", "settings:write", "packages:approve", "audit:read"] as const) {
      expect(can("OWNER", p)).toBe(true);
    }
  });

  it("only owner manages staff and settings", () => {
    for (const r of STAFF_ROLES.filter((r) => r !== "OWNER")) {
      expect(can(r, "staff:manage")).toBe(false);
      expect(can(r, "settings:write")).toBe(false);
    }
  });

  it("only owner and store manager approve packages", () => {
    expect(can("STORE_MANAGER", "packages:approve")).toBe(true);
    expect(can("SALES_REP", "packages:approve")).toBe(false);
    expect(can("CONTENT_EDITOR", "packages:approve")).toBe(false);
  });

  it("sales reps work leads but cannot edit the catalogue", () => {
    expect(can("SALES_REP", "leads:write")).toBe(true);
    expect(can("SALES_REP", "catalogue:write")).toBe(false);
  });

  it("content editors edit content only", () => {
    expect(can("CONTENT_EDITOR", "content:write")).toBe(true);
    expect(can("CONTENT_EDITOR", "orders:read")).toBe(false);
    expect(can("CONTENT_EDITOR", "catalogue:write")).toBe(false);
  });

  it("customers are not staff", () => {
    expect(isStaffRole("CUSTOMER")).toBe(false);
    expect(isStaffRole(undefined)).toBe(false);
    expect(isStaffRole("OWNER")).toBe(true);
  });
});

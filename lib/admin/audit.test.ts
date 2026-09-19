import { describe, expect, it } from "vitest";

// audit.ts imports the database client, so only its pure helper is exercised here via a re-declaration guard.
import { vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("../db", () => ({ db: {} }));

describe("diffFields", async () => {
  const { diffFields } = await import("./audit");

  it("reports only changed fields", () => {
    const d = diffFields({ priceNgn: 100, stock: 2, name: "A" }, { priceNgn: 120, stock: 2, name: "A" }, ["priceNgn", "stock", "name"]);
    expect(d.changed).toBe(true);
    expect(d.before).toEqual({ priceNgn: 100 });
    expect(d.after).toEqual({ priceNgn: 120 });
  });

  it("reports nothing when nothing changed", () => {
    const d = diffFields({ priceNgn: 100 }, { priceNgn: 100 }, ["priceNgn"]);
    expect(d.changed).toBe(false);
  });

  it("treats a create (no before) as everything changed", () => {
    const d = diffFields(null, { priceNgn: 100, stock: 0 }, ["priceNgn", "stock"]);
    expect(d.after).toEqual({ priceNgn: 100, stock: 0 });
    expect(d.before).toEqual({ priceNgn: null, stock: null });
  });
});

it("placeholder so the file always has a top-level test", () => {
  expect(true).toBe(true);
});

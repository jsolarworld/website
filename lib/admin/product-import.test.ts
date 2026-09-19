import { describe, expect, it } from "vitest";
import { planImport, type ImportContext } from "./product-import";

const ctx = (): ImportContext => ({
  categories: [
    { id: "c-inv", slug: "inverters", name: "Inverters", specTemplate: [{ key: "ratedKva", label: "Rating", unit: "kVA" }, { key: "type", label: "Type" }] },
    { id: "c-bat", slug: "lithium-batteries", name: "Lithium Batteries", specTemplate: [] },
  ],
  brands: [{ id: "b-fel", slug: "felicity", name: "Felicity" }],
  existing: new Map([["INV-1", { id: "p1", slug: "old-inverter", priceNgn: 900_000, salePriceNgn: null, stock: 2, status: "PUBLISHED", categoryId: "c-inv" }]]),
  takenSlugs: new Set(["old-inverter", "felicity-12kva"]),
});

const HEAD = "sku,name,category,brand,price,sale_price,stock,status,spec_ratedkva\n";

describe("planImport", () => {
  it("creates a new product with everything resolved", () => {
    const r = planImport(HEAD + "INV-2,Felicity 12kVA,Inverters,Felicity,\"1,000,000\",,3,published,12", ctx());
    expect(r.errors).toEqual([]);
    expect(r.created).toBe(1);
    expect(r.rows[0]).toMatchObject({ action: "create", sku: "INV-2", slug: "felicity-12kva-2" });
    expect(r.rows[0].fields).toMatchObject({ categoryId: "c-inv", brandId: "b-fel", priceNgn: 1_000_000, stock: 3, status: "PUBLISHED", specs: { ratedKva: 12 } });
  });

  it("updates an existing SKU and leaves blank cells alone", () => {
    const r = planImport("sku,price,stock\nINV-1,950000,", ctx());
    expect(r.errors).toEqual([]);
    expect(r.rows[0]).toMatchObject({ action: "update", slug: "old-inverter" });
    expect(r.rows[0].fields).toEqual({ priceNgn: 950_000 });
  });

  it("requires name, category and price for new products", () => {
    const r = planImport("sku,name\nNEW-1,Thing", ctx());
    expect(r.rows).toHaveLength(0);
    expect(r.errors.map((e) => e.message).join(" ")).toMatch(/category/);
    expect(r.errors.map((e) => e.message).join(" ")).toMatch(/price/);
  });

  it("reports line numbers and keeps good rows", () => {
    const r = planImport(HEAD + "A,Good,Inverters,,1000,,1,,\nB,Bad,Nowhere,,1000,,1,,", ctx());
    expect(r.rows).toHaveLength(1);
    expect(r.errors).toEqual([{ line: 3, message: 'B: unknown category "Nowhere"' }]);
  });

  it("rejects unknown brands, bad numbers and a sale price above the price", () => {
    expect(planImport(HEAD + "A,X,Inverters,Nope,1000,,1,,", ctx()).errors[0].message).toMatch(/unknown brand/);
    expect(planImport(HEAD + "A,X,Inverters,,12.5,,1,,", ctx()).errors[0].message).toMatch(/whole number/);
    expect(planImport(HEAD + "A,X,Inverters,,1000,2000,1,,", ctx()).errors[0].message).toMatch(/lower than price/);
  });

  it("rejects spec columns the category does not have and non-numeric unit specs", () => {
    expect(planImport("sku,name,category,price,spec_colour\nA,X,Inverters,1000,red", ctx()).errors[0].message).toMatch(/not a spec/);
    expect(planImport("sku,name,category,price,spec_ratedkva\nA,X,Inverters,1000,big", ctx()).errors[0].message).toMatch(/number/);
  });

  it("rejects duplicate SKUs inside one file", () => {
    const r = planImport("sku,name,category,price\nA,X,Inverters,1\nA,Y,Inverters,2", ctx());
    expect(r.rows).toHaveLength(1);
    expect(r.errors[0].message).toMatch(/twice/);
  });

  it("gives two new products with the same name different slugs", () => {
    const r = planImport("sku,name,category,price\nA,Fan Kit,Inverters,1\nB,Fan Kit,Inverters,2", ctx());
    expect(r.rows.map((x) => x.slug)).toEqual(["fan-kit", "fan-kit-2"]);
  });

  it("needs a sku column and refuses huge files", () => {
    expect(planImport("name\nX", ctx()).errors[0].message).toMatch(/sku/);
    const big = "sku,name,category,price\n" + Array.from({ length: 2001 }, (_, i) => `S${i},N${i},Inverters,1`).join("\n");
    expect(planImport(big, ctx()).errors[0].message).toMatch(/Too many/);
  });
});

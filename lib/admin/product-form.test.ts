import { describe, expect, it } from "vitest";
import { parseProductForm, type SpecField } from "./product-form";

const template: SpecField[] = [
  { key: "ratedKva", label: "Rating", unit: "kVA" },
  { key: "type", label: "Type" },
];

function form(fields: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

const base = { name: "12kVA Felicity Inverter", categoryId: "cat1", priceNgn: "1,000,000", stock: "3" };

describe("parseProductForm", () => {
  it("accepts a minimal product and derives the slug", () => {
    const r = parseProductForm(form(base), template);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.slug).toBe("12kva-felicity-inverter");
      expect(r.data.priceNgn).toBe(1_000_000);
      expect(r.data.status).toBe("DRAFT");
      expect(r.data.package).toBeNull();
    }
  });

  it("reports missing name, category and price together", () => {
    const r = parseProductForm(form({}), template);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors)).toEqual(expect.arrayContaining(["name", "categoryId", "priceNgn"]));
  });

  it("rejects a sale price that is not lower", () => {
    const r = parseProductForm(form({ ...base, salePriceNgn: "1000000" }), template);
    expect(!r.ok && r.errors.salePriceNgn).toBeTruthy();
  });

  it("rejects fractional, negative and absurd numbers", () => {
    expect(parseProductForm(form({ ...base, priceNgn: "10.5" }), template).ok).toBe(false);
    expect(parseProductForm(form({ ...base, stock: "-1" }), template).ok).toBe(false);
    expect(parseProductForm(form({ ...base, priceNgn: "99999999999" }), template).ok).toBe(false);
  });

  it("keeps only specs from the template and requires numbers for unit fields", () => {
    const ok = parseProductForm(form({ ...base, "spec.ratedKva": "12", "spec.type": "Hybrid", "spec.evil": "x" }), template);
    expect(ok.ok && ok.data.specs).toEqual({ ratedKva: 12, type: "Hybrid" });
    const bad = parseProductForm(form({ ...base, "spec.ratedKva": "twelve" }), template);
    expect(!bad.ok && bad.errors["spec.ratedKva"]).toBeTruthy();
  });

  it("requires alt text and Cloudinary URLs on photos and videos", () => {
    const good = JSON.stringify([
      { kind: "IMAGE", url: "https://res.cloudinary.com/x/image/upload/a.jpg", alt: "Front view" },
      { kind: "VIDEO", url: "https://res.cloudinary.com/x/video/upload/v1/b.mp4", alt: "Unboxing" },
    ]);
    const ok = parseProductForm(form({ ...base, media: good }), template);
    expect(ok.ok && ok.data.media.map((m) => m.kind)).toEqual(["IMAGE", "VIDEO"]);

    const noAlt = JSON.stringify([{ kind: "IMAGE", url: "https://res.cloudinary.com/x/image/upload/a.jpg", alt: " " }]);
    const r1 = parseProductForm(form({ ...base, media: noAlt }), template);
    expect(!r1.ok && r1.errors.media).toMatch(/description/);

    const foreign = JSON.stringify([{ kind: "IMAGE", url: "https://evil.example/a.jpg", alt: "x" }]);
    expect(parseProductForm(form({ ...base, media: foreign }), template).ok).toBe(false);
  });

  it("rejects a video whose URL is really an image upload, and the other way round", () => {
    const videoAsImage = JSON.stringify([{ kind: "VIDEO", url: "https://res.cloudinary.com/x/image/upload/a.jpg", alt: "x" }]);
    expect(parseProductForm(form({ ...base, media: videoAsImage }), template).ok).toBe(false);
    const imageAsVideo = JSON.stringify([{ kind: "IMAGE", url: "https://res.cloudinary.com/x/video/upload/a.mp4", alt: "x" }]);
    expect(parseProductForm(form({ ...base, media: imageAsVideo }), template).ok).toBe(false);
  });

  it("handles the add-a-new-brand choice", () => {
    const ok = parseProductForm(form({ ...base, brandId: "__new", newBrand: "  Lvtopsun   Power " }), template);
    expect(ok.ok && ok.data.brandId).toBeNull();
    expect(ok.ok && ok.data.newBrandName).toBe("Lvtopsun Power");

    const blank = parseProductForm(form({ ...base, brandId: "__new", newBrand: " " }), template);
    expect(!blank.ok && blank.errors.brandId).toBeTruthy();

    const existing = parseProductForm(form({ ...base, brandId: "brand_123" }), template);
    expect(existing.ok && existing.data.brandId).toBe("brand_123");
    expect(existing.ok && existing.data.newBrandName).toBeNull();
  });

  it("rejects a non-https datasheet link", () => {
    const r = parseProductForm(form({ ...base, datasheetUrl: "javascript:alert(1)" }), template);
    expect(!r.ok && r.errors.datasheetUrl).toBeTruthy();
  });

  describe("packages", () => {
    const pkg = {
      ...base,
      kind: "PACKAGE",
      "pkg.chemistry": "LITHIUM",
      "pkg.inverterContinuousW": "3000",
      "pkg.inverterSurgeW": "6000",
      "pkg.batteryWh": "5120",
      "pkg.arrayW": "1650",
      components: JSON.stringify([{ componentId: "inv1", quantity: 1 }, { componentId: "bat1", quantity: 1 }]),
    };

    it("accepts a complete package", () => {
      const r = parseProductForm(form(pkg), template);
      expect(r.ok && r.data.package?.batteryWh).toBe(5120);
      expect(r.ok && r.data.package?.approved).toBe(false);
    });

    it("requires components, sane surge and unique items", () => {
      expect(parseProductForm(form({ ...pkg, components: "[]" }), template).ok).toBe(false);
      expect(parseProductForm(form({ ...pkg, "pkg.inverterSurgeW": "2000" }), template).ok).toBe(false);
      const dup = JSON.stringify([{ componentId: "a", quantity: 1 }, { componentId: "a", quantity: 2 }]);
      expect(parseProductForm(form({ ...pkg, components: dup }), template).ok).toBe(false);
    });

    it("reads the approved checkbox", () => {
      const r = parseProductForm(form({ ...pkg, "pkg.approved": "on" }), template);
      expect(r.ok && r.data.package?.approved).toBe(true);
    });
  });
});

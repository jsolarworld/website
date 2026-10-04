import { describe, expect, it } from "vitest";
import { categoryLabel, parsePostForm, readingMinutes, toBlocks } from "./blog";

const PHOTO = "https://res.cloudinary.com/demo/image/upload/v1/blog/panels.jpg";
const BODY = "Choosing an inverter starts with the appliances you want to power at the same time. Add up their watts first.";

const form = (fields: Record<string, string>) => ({ get: (k: string) => fields[k] ?? null });
const media = (items: object[]) => JSON.stringify(items);

describe("toBlocks", () => {
  it("turns blank-line separated text into paragraphs, headings and lists", () => {
    const blocks = toBlocks("Intro line one\nstill the intro.\n\n## What size?\n\n- Fans\n- TV\n\nThat is all.");
    expect(blocks).toEqual([
      { type: "paragraph", text: "Intro line one still the intro." },
      { type: "heading", text: "What size?", id: "what-size" },
      { type: "list", items: ["Fans", "TV"] },
      { type: "paragraph", text: "That is all." },
    ]);
  });

  it("splits a paragraph and a list written without a blank line between them", () => {
    expect(toBlocks("You need:\n- an inverter\n- batteries\nThen panels.").map((b) => b.type)).toEqual(["paragraph", "list", "paragraph"]);
  });

  it("gives repeated headings their own anchors", () => {
    const ids = toBlocks("## Cost\n\n## Cost").flatMap((b) => (b.type === "heading" ? [b.id] : []));
    expect(ids).toEqual(["cost", "cost-2"]);
  });

  it("keeps markup as plain text", () => {
    expect(toBlocks("<script>alert(1)</script>")).toEqual([{ type: "paragraph", text: "<script>alert(1)</script>" }]);
  });
});

describe("readingMinutes", () => {
  it("is at least one minute and about 200 words a minute", () => {
    expect(readingMinutes("short")).toBe(1);
    expect(readingMinutes(Array(1000).fill("word").join(" "))).toBe(5);
  });
});

describe("parsePostForm", () => {
  it("accepts a draft with only a title and body, and makes the web address from the title", () => {
    const r = parsePostForm(form({ title: "How big an inverter do I need?", body: BODY }));
    expect(r.ok && r.data).toMatchObject({ slug: "how-big-an-inverter-do-i-need", status: "DRAFT", featuredImage: null, category: null });
  });

  it("needs a photo and a summary before publishing", () => {
    const r = parsePostForm(form({ title: "How big an inverter do I need?", body: BODY, status: "PUBLISHED" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["excerpt", "media"]);
  });

  it("publishes with one described Cloudinary photo", () => {
    const r = parsePostForm(
      form({ title: "How big an inverter do I need?", body: BODY, status: "PUBLISHED", excerpt: "Add up your watts.", category: "buying-guides", media: media([{ kind: "IMAGE", url: PHOTO, alt: "Solar panels on a roof" }]) }),
    );
    expect(r.ok && r.data).toMatchObject({ status: "PUBLISHED", featuredImage: PHOTO, featuredAlt: "Solar panels on a roof", category: "buying-guides" });
  });

  it("refuses a video, two photos, a photo from another site, or a photo with no description", () => {
    const base = { title: "How big an inverter do I need?", body: BODY };
    const errorOf = (m: object[]) => {
      const r = parsePostForm(form({ ...base, media: media(m) }));
      return r.ok ? null : r.errors.media;
    };
    expect(errorOf([{ kind: "VIDEO", url: PHOTO, alt: "x" }])).toMatch(/one photo/);
    expect(errorOf([{ kind: "IMAGE", url: PHOTO, alt: "a" }, { kind: "IMAGE", url: PHOTO, alt: "b" }])).toMatch(/one photo/);
    expect(errorOf([{ kind: "IMAGE", url: "https://evil.example/x.jpg", alt: "x" }])).toMatch(/could not be read/);
    expect(errorOf([{ kind: "IMAGE", url: PHOTO, alt: " " }])).toMatch(/Describe/);
  });

  it("refuses a short title, a thin body, a bad web address and an unknown category", () => {
    const r = parsePostForm(form({ title: "Hi", body: "Too short", slug: "Bad Slug", category: "gossip" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["body", "category", "slug", "title"]);
  });
});

describe("categoryLabel", () => {
  it("names known categories only", () => {
    expect(categoryLabel("prices")).toBe("Prices");
    expect(categoryLabel("gossip")).toBeNull();
    expect(categoryLabel(null)).toBeNull();
  });
});

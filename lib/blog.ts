import { isCloudinaryMedia } from "./media";
import { slugify } from "./slug";

/** Blog rules, pure so they can be tested without a browser or database (PRD 5.6). */

export const BLOG_CATEGORIES = [
  { slug: "buying-guides", label: "Buying guides" },
  { slug: "prices", label: "Prices" },
  { slug: "installation", label: "Installation" },
  { slug: "maintenance", label: "Maintenance" },
  { slug: "news", label: "News" },
] as const;
export type BlogCategory = (typeof BLOG_CATEGORIES)[number]["slug"];

export const categoryLabel = (slug: string | null | undefined) => BLOG_CATEGORIES.find((c) => c.slug === slug)?.label ?? null;
export const isBlogCategory = (v: unknown): v is BlogCategory => BLOG_CATEGORIES.some((c) => c.slug === v);

/**
 * Post bodies are plain text with three conventions, so staff never write HTML and nothing they type can
 * inject markup: a blank line starts a new paragraph, "## " starts a heading, "- " starts a list item.
 */
export type Block = { type: "heading"; text: string; id: string } | { type: "paragraph"; text: string } | { type: "list"; items: string[] };

export function toBlocks(body: string): Block[] {
  const blocks: Block[] = [];
  const used = new Set<string>();
  for (const chunk of body.replace(/\r\n/g, "\n").split(/\n\s*\n/)) {
    const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
    let para: string[] = [];
    let list: string[] = [];
    const flush = () => {
      if (para.length) blocks.push({ type: "paragraph", text: para.join(" ") });
      if (list.length) blocks.push({ type: "list", items: list });
      para = [];
      list = [];
    };
    for (const line of lines) {
      if (line.startsWith("## ")) {
        flush();
        const text = line.slice(3).trim();
        let id = slugify(text) || "section";
        for (let n = 2; used.has(id); n++) id = `${slugify(text) || "section"}-${n}`;
        used.add(id);
        blocks.push({ type: "heading", text, id });
      } else if (line.startsWith("- ")) {
        if (para.length) flush();
        list.push(line.slice(2).trim());
      } else {
        if (list.length) flush();
        para.push(line);
      }
    }
    flush();
  }
  return blocks;
}

/** About 200 words a minute, never less than one. */
export const readingMinutes = (body: string) => Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / 200));

export interface PostInput {
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  category: BlogCategory | null;
  featuredImage: string | null;
  featuredAlt: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  seoTitle: string | null;
  seoDescription: string | null;
}

interface FormLike {
  get(name: string): FormDataEntryValue | null;
}

export function parsePostForm(form: FormLike): { ok: true; data: PostInput } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const text = (key: string, max: number) => {
    const v = form.get(key);
    const t = typeof v === "string" ? v.trim().slice(0, max) : "";
    return t === "" ? null : t;
  };

  const title = text("title", 140);
  if (!title || title.length < 5) errors.title = "Enter a title (at least 5 letters)";
  const slug = text("slug", 100) ?? slugify(title ?? "");
  if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) errors.slug = "Use lowercase letters, numbers and single hyphens only";
  const bodyRaw = form.get("body");
  const body = typeof bodyRaw === "string" ? bodyRaw.replace(/\r\n/g, "\n").trim().slice(0, 50_000) : "";
  if (body.length < 50) errors.body = "Write the article (at least a few sentences)";

  const categoryRaw = text("category", 40);
  const category = isBlogCategory(categoryRaw) ? categoryRaw : null;
  if (categoryRaw && !category) errors.category = "Choose a category";

  // The photo comes from the shared uploader as JSON: [{ kind, url, alt }]. Posts take one photo.
  let featuredImage: string | null = null;
  let featuredAlt: string | null = null;
  const mediaRaw = form.get("media");
  if (typeof mediaRaw === "string" && mediaRaw.trim() !== "" && mediaRaw.trim() !== "[]") {
    try {
      const items: unknown = JSON.parse(mediaRaw);
      if (!Array.isArray(items)) throw new Error("bad");
      if (items.length > 1 || items.some((m) => m?.kind !== "IMAGE")) errors.media = "Add one photo only (no videos)";
      else {
        const [m] = items as { url?: unknown; alt?: unknown }[];
        const url = typeof m.url === "string" ? m.url : "";
        const alt = typeof m.alt === "string" ? m.alt.trim().slice(0, 200) : "";
        if (!isCloudinaryMedia("IMAGE", url)) throw new Error("bad");
        if (!alt) errors.media = "Describe the photo in a few words";
        featuredImage = url;
        featuredAlt = alt || null;
      }
    } catch {
      errors.media = "The photo could not be read. Remove it and upload again.";
    }
  }

  const statusRaw = form.get("status");
  const status = statusRaw === "PUBLISHED" || statusRaw === "ARCHIVED" ? statusRaw : "DRAFT";
  // A published post needs a photo and a summary: they are what the blog list and search results show.
  if (status === "PUBLISHED" && !featuredImage && !errors.media) errors.media = "Add a photo before publishing";
  const excerpt = text("excerpt", 300);
  if (status === "PUBLISHED" && !excerpt) errors.excerpt = "Write a one or two sentence summary before publishing";

  if (Object.keys(errors).length > 0 || !title || !slug) return { ok: false, errors };
  return {
    ok: true,
    data: { title, slug, excerpt, body, category, featuredImage, featuredAlt, status, seoTitle: text("seoTitle", 70), seoDescription: text("seoDescription", 170) },
  };
}

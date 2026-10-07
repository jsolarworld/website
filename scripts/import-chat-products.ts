import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { UPLOAD_FOLDER, parseCloudinaryUrl, signParams } from "../lib/cloudinary";
import { db } from "../lib/db";
import { isCloudinaryMedia, type MediaKind } from "../lib/media";
import { slugify } from "../lib/slug";
import { BRAND_RENAMES, CHAT_ADDITIONS, CHAT_PRODUCTS, type ChatMedia, type ChatProduct } from "./chat-products";

// Usage: pnpm import:chat            check the list against the database and the chat/ folder; changes nothing
//        pnpm import:chat --apply    upload the photos and videos to Cloudinary and create the products
//        add --priced-only           to leave out products that have no price yet
//
// Safe to run again: a product whose web address already exists (or once existed and was renamed) is skipped and
// never overwritten, and a file already uploaded is reused. Every product arrives as "available on request" with
// no stock count, so nothing can be bought online until staff enter the stock.
//
// CHAT_ADDITIONS are later photos for products already on the site: a photo is added once, after the ones the
// product has, and a description is filled in only while the product has none.

const apply = process.argv.includes("--apply");
const pricedOnly = process.argv.includes("--priced-only");
const CHAT_DIR = path.join(process.cwd(), "chat");

interface SpecField {
  key: string;
  unit?: string;
}

const kindOf = (file: string): MediaKind => (/\.(mp4|mov|webm)$/i.test(file) ? "VIDEO" : "IMAGE");

/** The database and Cloudinary are both a long way from Lagos; a dropped connection is retried, a real error is not. */
async function retry<T>(what: string, run: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (e) {
      const text = `${(e as { code?: string }).code ?? ""} ${(e as Error).message ?? e} ${String((e as { cause?: unknown }).cause ?? "")}`;
      const transient = /P1001|P1002|P1017|ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|UND_ERR|fetch failed|terminated|socket/i.test(text);
      if (!transient || attempt >= 5) throw e;
      console.log(`  ${what}: connection dropped, trying again (${attempt})`);
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

/** The Cloudinary name of a chat file: its file name, plus the crop when there is one. */
const publicId = (m: ChatMedia) => `chat-${m.file.replace(/\.[a-z0-9]+$/i, "").toLowerCase()}${m.crop ? `-c${m.crop.join("-")}` : ""}`;

// One picture often stands for several sizes of a model, so each file is sent once per run.
const uploaded = new Map<string, string>();

/** Upload one file from chat/. The public id comes from the file name (and crop), so a second run reuses the upload. */
async function upload(m: ChatMedia): Promise<string> {
  const sent = uploaded.get(publicId(m));
  if (sent) return sent;
  const cfg = parseCloudinaryUrl(process.env.CLOUDINARY_URL);
  if (!cfg) throw new Error("CLOUDINARY_URL is not set");
  const kind = kindOf(m.file);
  const params: Record<string, string | number> = {
    folder: UPLOAD_FOLDER,
    overwrite: "false",
    public_id: publicId(m),
    timestamp: Math.floor(Date.now() / 1000),
  };
  if (m.crop) {
    const [x, y, w, h] = m.crop;
    params.transformation = `c_crop,x_${x},y_${y},w_${w},h_${h}`;
  }

  const body = new FormData();
  body.set("file", new Blob([readFileSync(path.join(CHAT_DIR, m.file))]), m.file);
  body.set("api_key", cfg.apiKey);
  body.set("signature", signParams(params, cfg.apiSecret));
  for (const [k, v] of Object.entries(params)) body.set(k, String(v));

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/${kind === "VIDEO" ? "video" : "image"}/upload`, { method: "POST", body });
  const json = (await res.json().catch(() => null)) as { secure_url?: string; error?: { message?: string } } | null;
  if (!res.ok || !json?.secure_url) throw new Error(`${m.file}: ${json?.error?.message ?? `upload failed (${res.status})`}`);
  if (!isCloudinaryMedia(kind, json.secure_url)) throw new Error(`${m.file}: unexpected upload address ${json.secure_url}`);
  uploaded.set(publicId(m), json.secure_url);
  return json.secure_url;
}

async function main() {
  const [categories, existing, redirects] = await retry("reading the catalogue", () =>
    Promise.all([
      db.category.findMany(),
      db.product.findMany({ select: { id: true, slug: true, name: true, description: true, media: { select: { url: true, sortOrder: true } } } }),
      db.redirect.findMany({ select: { fromPath: true, toPath: true } }),
    ]),
  );
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));
  const productBySlug = new Map(existing.map((p) => [p.slug, p]));
  const address = (path: string) => path.replace(/^\/products\//, "");
  // A renamed product leaves a redirect from its old address, so it is not created a second time.
  const taken = new Set([...existing.map((p) => p.slug), ...redirects.map((r) => address(r.fromPath))]);
  const movedTo = new Map(redirects.map((r) => [address(r.fromPath), address(r.toPath)]));

  // Check the whole list before touching anything.
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const p of CHAT_PRODUCTS) {
    const slug = slugify(p.name);
    if (!slug) problems.push(`${p.name}: cannot make a web address from this name`);
    if (seen.has(slug)) problems.push(`${p.name}: listed twice`);
    seen.add(slug);
    const category = categoryBySlug.get(p.category);
    if (!category) problems.push(`${p.name}: unknown category "${p.category}"`);
    const template = (category?.specTemplate ?? []) as unknown as SpecField[];
    for (const [key, value] of Object.entries(p.specs ?? {})) {
      const field = template.find((f) => f.key === key);
      if (!field) problems.push(`${p.name}: "${key}" is not a spec of ${category?.name ?? p.category}`);
      else if (field.unit && typeof value !== "number") problems.push(`${p.name}: spec "${key}" must be a number`);
    }
    if (p.priceNgn != null && (!Number.isInteger(p.priceNgn) || p.priceNgn < 1)) problems.push(`${p.name}: bad price`);
    for (const m of p.media) {
      // The chat folder is replaced by each new export, so only a product still to be created needs its files.
      if (!taken.has(slug) && !existsSync(path.join(CHAT_DIR, m.file))) problems.push(`${p.name}: chat/${m.file} is missing`);
      if (!m.alt.trim()) problems.push(`${p.name}: ${m.file} needs a description`);
    }
  }

  // Later photos and descriptions for products already on the site: keep only what each product still lacks.
  const additions: { product: (typeof existing)[number]; media: ChatMedia[]; description?: string }[] = [];
  for (const a of CHAT_ADDITIONS) {
    const product = productBySlug.get(a.slug) ?? productBySlug.get(movedTo.get(a.slug) ?? "");
    if (!product) {
      problems.push(`Addition for "${a.slug}": no product has this web address`);
      continue;
    }
    const media = a.media.filter((m) => !product.media.some((have) => have.url.includes(`/${publicId(m)}.`)));
    for (const m of media) {
      if (!existsSync(path.join(CHAT_DIR, m.file))) problems.push(`${product.name}: chat/${m.file} is missing`);
      if (!m.alt.trim()) problems.push(`${product.name}: ${m.file} needs a description`);
    }
    const description = product.description?.trim() ? undefined : a.description;
    if (media.length > 0 || description) additions.push({ product, media, description });
  }
  if (problems.length > 0) {
    console.error(`The list has ${problems.length} problem(s). Nothing was changed.\n- ${problems.join("\n- ")}`);
    process.exitCode = 1;
    return;
  }

  const todo: ChatProduct[] = [];
  let already = 0;
  let heldBack = 0;
  for (const p of CHAT_PRODUCTS) {
    if (taken.has(slugify(p.name))) already++;
    else if (pricedOnly && p.priceNgn == null) heldBack++;
    else todo.push(p);
  }

  const files = todo.reduce((n, p) => n + p.media.length, 0);
  console.log(`${CHAT_PRODUCTS.length} products in the list: ${todo.length} to create (${files} photos and videos), ${already} already on the site${heldBack ? `, ${heldBack} without a price held back` : ""}.`);
  for (const p of todo) {
    const price = p.priceNgn != null ? `₦${p.priceNgn.toLocaleString("en-NG")}` : "no price";
    console.log(`  ${p.status === "DRAFT" ? "[draft] " : ""}${p.name} | ${p.category} | ${p.brand ?? "no brand"} | ${price} | ${p.media.length || "no"} file(s)`);
  }
  if (additions.length > 0) {
    console.log(`\n${additions.length} product(s) already on the site get something new:`);
    for (const a of additions) console.log(`  ${a.product.name} | ${a.media.length || "no"} new file(s)${a.description ? " | a description" : ""}`);
  }
  const notes = todo.filter((p) => p.note);
  if (notes.length > 0) console.log(`\nTo check:\n${notes.map((p) => `- ${p.name}: ${p.note}`).join("\n")}`);
  if (!apply) {
    console.log("\nNothing was changed. Run again with --apply to upload and create these.");
    return;
  }
  if (todo.length === 0 && additions.length === 0) return;

  // Brand names as printed on the products (see BRAND_RENAMES), then find or create each brand the list uses.
  for (const fix of BRAND_RENAMES) {
    const slug = slugify(fix.name);
    const [old, current] = await retry("brands", () => Promise.all([db.brand.findUnique({ where: { slug: fix.fromSlug } }), db.brand.findUnique({ where: { slug } })]));
    if (old && !current) {
      await retry("brands", () => db.brand.update({ where: { id: old.id }, data: { slug, name: fix.name } }));
      console.log(`Brand "${old.name}" renamed to "${fix.name}".`);
    }
  }
  const brandIds = new Map<string, string>();
  for (const name of new Set(todo.map((p) => p.brand).filter((b): b is string => b != null))) {
    const slug = slugify(name);
    const brand = await retry("brands", async () => {
      const found = await db.brand.findFirst({ where: { OR: [{ slug }, { name: { equals: name, mode: "insensitive" } }] } });
      return found ?? db.brand.create({ data: { slug, name } });
    });
    brandIds.set(name, brand.id);
  }

  const created: { id: string; name: string; slug: string }[] = [];
  const failed: string[] = [];
  for (const [i, p] of todo.entries()) {
    const slug = slugify(p.name);
    try {
      const media: { kind: MediaKind; url: string; alt: string; sortOrder: number }[] = [];
      for (const [order, m] of p.media.entries()) {
        media.push({ kind: kindOf(m.file), url: await retry(m.file, () => upload(m)), alt: m.alt, sortOrder: order });
      }
      const product = await retry(p.name, async () => {
        // A retry after a dropped connection must not create the product twice.
        const again = await db.product.findUnique({ where: { slug }, select: { id: true } });
        if (again) return again;
        return db.product.create({
          data: {
            kind: "PRODUCT",
            slug,
            name: p.name,
            description: p.description ?? null,
            categoryId: categoryBySlug.get(p.category)!.id,
            brandId: p.brand ? brandIds.get(p.brand)! : null,
            priceNgn: p.priceNgn,
            stock: 0,
            availableOnRequest: true,
            specs: p.specs ?? {},
            status: p.status ?? "PUBLISHED",
            media: { create: media },
          },
          select: { id: true },
        });
      });
      created.push({ id: product.id, name: p.name, slug });
      console.log(`${i + 1}/${todo.length} created: ${p.name}`);
    } catch (e) {
      failed.push(`${p.name}: ${(e as Error).message ?? e}`);
      console.error(`${i + 1}/${todo.length} FAILED: ${p.name}: ${(e as Error).message ?? e}`);
    }
  }

  const added: { id: string; name: string; files: number; description: boolean }[] = [];
  for (const a of additions) {
    try {
      const last = Math.max(-1, ...a.product.media.map((m) => m.sortOrder));
      const media: { kind: MediaKind; url: string; alt: string; sortOrder: number }[] = [];
      for (const [i, m] of a.media.entries()) {
        media.push({ kind: kindOf(m.file), url: await retry(m.file, () => upload(m)), alt: m.alt, sortOrder: last + 1 + i });
      }
      await retry(a.product.name, async () => {
        // A retry after a dropped connection must not add the same photo twice.
        const have = await db.productMedia.findMany({ where: { productId: a.product.id }, select: { url: true } });
        const fresh = media.filter((m) => !have.some((h) => h.url === m.url));
        await db.product.update({
          where: { id: a.product.id },
          data: { ...(a.description ? { description: a.description } : {}), media: { create: fresh } },
        });
      });
      added.push({ id: a.product.id, name: a.product.name, files: media.length, description: Boolean(a.description) });
      console.log(`added to: ${a.product.name}`);
    } catch (e) {
      failed.push(`${a.product.name}: ${(e as Error).message ?? e}`);
      console.error(`FAILED: ${a.product.name}: ${(e as Error).message ?? e}`);
    }
  }

  if (created.length > 0 || added.length > 0) {
    await retry("audit log", () =>
      db.auditLog.create({
        data: {
          action: "product.import",
          entity: "Product",
          entityId: "bulk",
          after: { source: "WhatsApp chat export (scripts/import-chat-products.ts)", created: created.length, products: created, addedTo: added },
        },
      }),
    );
  }
  console.log(`\nDone: ${created.length} created${added.length ? `, ${added.length} already on the site added to` : ""}${failed.length ? `, ${failed.length} failed (run again to retry them)` : ""}.`);
  if (failed.length > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

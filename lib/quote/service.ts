import "server-only";
import { randomInt } from "node:crypto";
import { db } from "../db";
import { effectivePrice } from "../catalogue";
import { DEFAULT_SETTINGS } from "./defaults";
import { computeNeeds, matchPackages } from "./engine";
import type { Contact, QuoteRequest } from "./request";
import type { Chemistry, QuotePackage, QuoteSettings } from "./types";
import { buildView, type PackageMeta, type QuoteView } from "./view";

const toChem = (c: "LITHIUM" | "TUBULAR"): Chemistry => (c === "LITHIUM" ? "lithium" : "tubular");

export async function loadSettings(): Promise<QuoteSettings> {
  const row = await db.setting.findUnique({ where: { key: "quote.settings" } });
  const stored = (row?.value ?? {}) as Partial<QuoteSettings>;
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    depthOfDischarge: { ...DEFAULT_SETTINGS.depthOfDischarge, ...stored.depthOfDischarge },
  };
}

/** Approved, published packages whose components are all available. Only these are ever recommended. */
export async function loadPackages() {
  const rows = await db.product.findMany({
    where: { kind: "PACKAGE", status: "PUBLISHED", packageSpec: { is: { approved: true } } },
    include: { packageSpec: true, components: { include: { component: true } } },
  });

  const packages: QuotePackage[] = [];
  const meta = new Map<string, PackageMeta>();
  for (const r of rows) {
    const spec = r.packageSpec!;
    const unavailable = r.components.some((c) => !c.component.availableOnRequest && c.component.stock < c.quantity);
    if (unavailable || (!r.availableOnRequest && r.stock <= 0)) continue;
    packages.push({
      id: r.id,
      name: r.name,
      price: effectivePrice(r),
      chemistry: toChem(spec.chemistry),
      inverterContinuousW: spec.inverterContinuousW,
      inverterSurgeW: spec.inverterSurgeW,
      batteryWh: spec.batteryWh,
      arrayW: spec.arrayW,
      approved: spec.approved,
    });
    meta.set(r.id, {
      slug: r.slug,
      components: r.components.map((c) => ({ name: c.component.name, slug: c.component.slug, quantity: c.quantity })),
    });
  }
  return { packages, meta };
}

export async function runQuote(req: QuoteRequest, preloaded?: QuoteSettings): Promise<QuoteView> {
  const [settings, { packages, meta }] = await Promise.all([preloaded ?? loadSettings(), loadPackages()]);
  const needs = computeNeeds(req.input, settings);
  const result = matchPackages(needs, packages, settings, req.chemistry);
  return buildView(result, req.input.backupHours, meta, req.budgetNgn);
}

// No 0/O/1/I so a reference read aloud over the phone isn't misheard.
const REF_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const newReference = () => "JSW-" + Array.from({ length: 6 }, () => REF_ALPHABET[randomInt(REF_ALPHABET.length)]).join("");

/** Save a quote snapshot and attach it to a lead (reusing an open lead for the same phone). */
export async function saveQuote(req: QuoteRequest, contact: Contact): Promise<string> {
  // Settings are loaded once and shared; the database is a transatlantic hop, so every query counts.
  const settings = await loadSettings();
  const [view, open] = await Promise.all([
    runQuote(req, settings),
    db.lead.findFirst({
      where: { phone: contact.phone, status: { notIn: ["WON", "LOST"] } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const validUntil = new Date(Date.now() + settings.quoteValidityDays * 24 * 60 * 60 * 1000);

  const lead = open
    ? await db.lead.update({
        where: { id: open.id },
        data: { name: open.name ?? contact.name, email: open.email ?? contact.email, consent: true },
      })
    : await db.lead.create({
        data: { source: "QUOTE", phone: contact.phone, name: contact.name, email: contact.email, consent: true },
      });

  // The unique constraint on `reference` is the collision check: retry with a new one on P2002.
  for (let attempt = 0; attempt < 5; attempt++) {
    const reference = newReference();
    try {
      await db.quote.create({
        data: {
          reference,
          leadId: lead.id,
          // Round-trip through JSON so undefined fields are dropped and the value is a plain JSON tree.
          inputs: JSON.parse(JSON.stringify({ ...req.input, state: req.state, area: req.area, budgetNgn: req.budgetNgn })),
          needs: JSON.parse(JSON.stringify(view.needs)),
          result: JSON.parse(JSON.stringify(view)),
          chemistry: req.chemistry ? (req.chemistry === "lithium" ? "LITHIUM" : "TUBULAR") : null,
          engineerReview: view.engineerReview,
          validUntil,
        },
      });
      return reference;
    } catch (e) {
      if ((e as { code?: string }).code !== "P2002") throw e;
    }
  }
  throw new Error("Could not allocate a quote reference");
}

export async function getSavedQuote(reference: string) {
  return db.quote.findUnique({ where: { reference }, include: { lead: { select: { name: true } } } });
}

export const isExpired = (validUntil: Date) => validUntil.getTime() < Date.now();

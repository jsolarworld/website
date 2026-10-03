import "server-only";
import type { Prisma } from "../../generated/prisma/client";
import { db } from "../db";
import { QUOTE_FIELDS, lacksQuoteDetails } from "./missing";
import type { SpecField } from "./product-form";

/**
 * Ids of products the quote tool reads but cannot use yet, within `where`. Ratings live in the specs
 * JSON, so they are checked in memory; only inverters, batteries and panels are loaded.
 */
export async function quoteGapIds(where: Prisma.ProductWhereInput = {}): Promise<string[]> {
  const rows = await db.product.findMany({
    where: { AND: [where, { kind: "PRODUCT", category: { slug: { in: Object.keys(QUOTE_FIELDS) } } }] },
    select: { id: true, kind: true, priceNgn: true, brandId: true, specs: true, category: { select: { slug: true, specTemplate: true } } },
  });
  return rows
    .filter((r) => lacksQuoteDetails({ ...r, categorySlug: r.category.slug, specTemplate: (r.category.specTemplate ?? []) as unknown as SpecField[] }))
    .map((r) => r.id);
}

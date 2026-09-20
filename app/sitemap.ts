import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { SITE } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([
    db.product.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
    db.category.findMany({ select: { slug: true } }),
  ]);
  const at = (path: string) => `${SITE.url}${path}`;
  return [
    { url: at("/") },
    { url: at("/products") },
    { url: at("/solar-quote") },
    { url: at("/track-order") },
    { url: at("/delivery") },
    { url: at("/returns-and-warranty") },
    { url: at("/terms") },
    { url: at("/privacy") },
    ...categories.map((c) => ({ url: at(`/categories/${c.slug}`) })),
    ...products.map((p) => ({ url: at(`/products/${p.slug}`), lastModified: p.updatedAt })),
  ];
}

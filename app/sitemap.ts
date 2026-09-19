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
    ...categories.map((c) => ({ url: at(`/categories/${c.slug}`) })),
    ...products.map((p) => ({ url: at(`/products/${p.slug}`), lastModified: p.updatedAt })),
  ];
}

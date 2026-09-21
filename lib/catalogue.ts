import { db } from "./db";
import type { Prisma } from "../generated/prisma/client";

export const PAGE_SIZE = 24;

export const SORTS = {
  newest: { label: "Newest", orderBy: { createdAt: "desc" } },
  "price-asc": { label: "Price: low to high", orderBy: { priceNgn: "asc" } },
  "price-desc": { label: "Price: high to low", orderBy: { priceNgn: "desc" } },
} as const satisfies Record<string, { label: string; orderBy: Prisma.ProductOrderByWithRelationInput }>;
export type SortKey = keyof typeof SORTS;

const cardInclude = {
  brand: true,
  category: true,
  // A few, not one: the card falls back to a video's still frame and shows a second photo on hover.
  media: { orderBy: { sortOrder: "asc" }, take: 4 },
} satisfies Prisma.ProductInclude;

export type ProductCardData = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

export const getCategories = () => db.category.findMany({ orderBy: { sortOrder: "asc" } });
export const getBrands = () => db.brand.findMany({ orderBy: { name: "asc" } });

export const getFeaturedProducts = (limit = 8) =>
  db.product.findMany({
    where: { status: "PUBLISHED", featured: true },
    include: cardInclude,
    take: limit,
    orderBy: { updatedAt: "desc" },
  });

export interface ListParams {
  category?: string;
  brand?: string;
  q?: string;
  sort?: SortKey;
  page?: number;
}

export async function listProducts({ category, brand, q, sort = "newest", page = 1 }: ListParams) {
  const where: Prisma.ProductWhereInput = {
    status: "PUBLISHED",
    ...(category && { category: { slug: category } }),
    ...(brand && { brand: { slug: brand } }),
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
        { brand: { name: { contains: q, mode: "insensitive" } } },
      ],
    }),
  };
  const [items, total] = await Promise.all([
    db.product.findMany({
      where,
      include: cardInclude,
      orderBy: SORTS[sort].orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.product.count({ where }),
  ]);
  return { items, total, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export const getProduct = (slug: string) =>
  db.product.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      brand: true,
      category: true,
      media: { orderBy: { sortOrder: "asc" } },
      packageSpec: true,
      components: { include: { component: true } },
    },
  });

export const getCategory = (slug: string) => db.category.findUnique({ where: { slug } });

export function stockStatus(p: { stock: number; lowStockThreshold: number; availableOnRequest: boolean }) {
  if (p.availableOnRequest) return { key: "request", label: "Available on request" } as const;
  if (p.stock <= 0) return { key: "out", label: "Out of stock" } as const;
  if (p.stock <= p.lowStockThreshold) return { key: "low", label: "Low stock" } as const;
  return { key: "in", label: "In stock" } as const;
}

export const effectivePrice = (p: { priceNgn: number; salePriceNgn: number | null }) => p.salePriceNgn ?? p.priceNgn;

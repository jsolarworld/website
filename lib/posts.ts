import { db } from "./db";

/** Published blog posts only. The blog rules (categories, body format, form) are in lib/blog.ts. */

export const POSTS_PER_PAGE = 12;

// Computed per call: a module-level date would freeze at server start and hide later posts.
const live = () => ({ status: "PUBLISHED" as const, publishedAt: { lte: new Date() } });

export async function listPosts({ category, page = 1 }: { category?: string; page?: number }) {
  const where = { ...live(), ...(category ? { category } : {}) };
  const [items, total] = await Promise.all([
    db.post.findMany({ where, orderBy: { publishedAt: "desc" }, skip: (page - 1) * POSTS_PER_PAGE, take: POSTS_PER_PAGE }),
    db.post.count({ where }),
  ]);
  return { items, total, pages: Math.max(1, Math.ceil(total / POSTS_PER_PAGE)) };
}

export const getPost = (slug: string) =>
  db.post.findFirst({ where: { slug, ...live() }, include: { author: { select: { name: true } } } });

/** Up to three other posts, same category first. */
export async function relatedPosts(post: { id: string; category: string | null }) {
  const same = post.category
    ? await db.post.findMany({ where: { ...live(), category: post.category, NOT: { id: post.id } }, orderBy: { publishedAt: "desc" }, take: 3 })
    : [];
  if (same.length >= 3) return same;
  const rest = await db.post.findMany({
    where: { ...live(), NOT: { id: { in: [post.id, ...same.map((p) => p.id)] } } },
    orderBy: { publishedAt: "desc" },
    take: 3 - same.length,
  });
  return [...same, ...rest];
}

/** Categories that have at least one live post, for the blog's filter links. */
export async function liveCategories() {
  const rows = await db.post.findMany({ where: { ...live(), category: { not: null } }, select: { category: true }, distinct: ["category"] });
  return rows.map((r) => r.category!);
}

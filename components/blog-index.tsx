import Image from "next/image";
import Link from "next/link";
import { Card, CardBody, Container, Eyebrow, Section, buttonClass } from "@/components/ui";
import { BLOG_CATEGORIES, categoryLabel } from "@/lib/blog";
import { listPosts, liveCategories } from "@/lib/posts";

const dateFmt = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" });

/** The blog list, shared by /blog and /blog/category/[slug]. */
export async function BlogIndex({ category, page, basePath }: { category?: string; page: number; basePath: string }) {
  const [{ items, pages }, cats] = await Promise.all([listPosts({ category, page }), liveCategories()]);
  const filters = BLOG_CATEGORIES.filter((c) => cats.includes(c.slug));
  const href = (n: number) => (n > 1 ? `${basePath}?page=${n}` : basePath);

  return (
    <>
      <Section tone="surface" className="border-b border-line py-10 sm:py-14">
        <Container>
          <Eyebrow className="text-solar-700">Blog</Eyebrow>
          <h1 className="mt-2 max-w-3xl text-display-2">{category ? categoryLabel(category) : "Solar guides and news"}</h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted">Plain advice on choosing, paying for and looking after a solar system in Nigeria.</p>
          {filters.length > 0 && (
            <nav aria-label="Blog categories" className="mt-6 flex flex-wrap gap-2">
              <Link href="/blog" className={`rounded-full px-3 py-1 text-sm ${!category ? "bg-chassis text-white" : "border border-line bg-surface text-strong hover:border-navy-600"}`}>
                All
              </Link>
              {filters.map((c) => (
                <Link
                  key={c.slug}
                  href={`/blog/category/${c.slug}`}
                  className={`rounded-full px-3 py-1 text-sm ${category === c.slug ? "bg-chassis text-white" : "border border-line bg-surface text-strong hover:border-navy-600"}`}
                >
                  {c.label}
                </Link>
              ))}
            </nav>
          )}
        </Container>
      </Section>

      <Section tone="page">
        <Container>
          {items.length === 0 ? (
            <div className="max-w-xl">
              <h2 className="text-title">Our first articles are on the way</h2>
              <p className="mt-2 text-muted">Until then, the quote tool works out the inverter, batteries and panels your home needs, or you can ask us directly.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/solar-quote" className={buttonClass({ variant: "primary" })}>
                  Get a free solar quote
                </Link>
                <Link href="/products" className={buttonClass({ variant: "outline" })}>
                  Browse products
                </Link>
              </div>
            </div>
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((p) => (
                <li key={p.id}>
                  <Card interactive className="h-full overflow-hidden">
                    {p.featuredImage && (
                      <div className="relative aspect-[16/9] bg-sunken">
                        <Image src={p.featuredImage} alt={p.featuredAlt ?? ""} fill sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw" className="object-cover" />
                      </div>
                    )}
                    <CardBody>
                      <p className="text-xs text-muted">{[categoryLabel(p.category), p.publishedAt && dateFmt.format(p.publishedAt)].filter(Boolean).join(" · ")}</p>
                      <h2 className="mt-2 text-subtitle">
                        <Link href={`/blog/${p.slug}`} className="after:absolute after:inset-0">
                          {p.title}
                        </Link>
                      </h2>
                      {p.excerpt && <p className="mt-2 text-sm leading-relaxed text-muted">{p.excerpt}</p>}
                    </CardBody>
                  </Card>
                </li>
              ))}
            </ul>
          )}

          {pages > 1 && (
            <nav className="mt-10 flex items-center justify-between" aria-label="Pagination">
              {page > 1 ? <Link href={href(page - 1)} className={buttonClass({ variant: "outline" })}>Newer posts</Link> : <span />}
              <span className="text-sm text-muted">
                Page {page} of {pages}
              </span>
              {page < pages ? <Link href={href(page + 1)} className={buttonClass({ variant: "outline" })}>Older posts</Link> : <span />}
            </nav>
          )}
        </Container>
      </Section>
    </>
  );
}

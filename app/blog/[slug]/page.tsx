import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Card, CardBody, Container, Eyebrow, Section, buttonClass } from "@/components/ui";
import { categoryLabel, readingMinutes, toBlocks } from "@/lib/blog";
import { db } from "@/lib/db";
import { getPost, relatedPosts } from "@/lib/posts";
import { SITE, jsonLd } from "@/lib/site";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

const dateFmt = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getPost((await params).slug);
  if (!p) return {};
  return {
    title: p.seoTitle ?? p.title,
    description: p.seoDescription ?? p.excerpt ?? undefined,
    alternates: { canonical: `/blog/${p.slug}` },
    openGraph: { type: "article", title: p.title, images: p.featuredImage ? [p.featuredImage] : undefined, publishedTime: p.publishedAt?.toISOString() },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) {
    // A renamed post keeps its old link working.
    const moved = await db.redirect.findUnique({ where: { fromPath: `/blog/${slug}` } });
    if (moved) permanentRedirect(moved.toPath);
    notFound();
  }

  const blocks = toBlocks(post.body);
  const headings = blocks.flatMap((b) => (b.type === "heading" ? [b] : []));
  const related = await relatedPosts(post);
  const url = `${SITE.url}/blog/${post.slug}`;
  const edited = post.publishedAt && post.updatedAt.getTime() - post.publishedAt.getTime() > 24 * 60 * 60 * 1000;
  const label = categoryLabel(post.category);

  const structured = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.excerpt ?? undefined,
      image: post.featuredImage ?? undefined,
      datePublished: post.publishedAt?.toISOString(),
      dateModified: post.updatedAt.toISOString(),
      author: { "@type": post.author?.name ? "Person" : "Organization", name: post.author?.name ?? SITE.name },
      publisher: { "@type": "Organization", name: SITE.name, logo: { "@type": "ImageObject", url: `${SITE.url}/logo.webp` } },
      mainEntityOfPage: url,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Blog", item: `${SITE.url}/blog` },
        ...(label ? [{ "@type": "ListItem", position: 2, name: label, item: `${SITE.url}/blog/category/${post.category}` }] : []),
        { "@type": "ListItem", position: label ? 3 : 2, name: post.title, item: url },
      ],
    },
  ];

  return (
    <>
      {structured.map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(d) }} />
      ))}
      <Section tone="page" className="py-8 sm:py-12">
        <Container className="max-w-3xl">
          <nav aria-label="Breadcrumb" className="text-sm text-muted">
            <Link href="/blog" className="hover:text-strong">
              Blog
            </Link>
            {label && (
              <>
                {" / "}
                <Link href={`/blog/category/${post.category}`} className="hover:text-strong">
                  {label}
                </Link>
              </>
            )}
          </nav>

          <h1 className="mt-4 text-display-2">{post.title}</h1>
          <p className="mt-3 text-sm text-muted">
            {[
              post.author?.name ? `By ${post.author.name}` : null,
              post.publishedAt && `Published ${dateFmt.format(post.publishedAt)}`,
              edited ? `updated ${dateFmt.format(post.updatedAt)}` : null,
              `${readingMinutes(post.body)} min read`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>

          {post.featuredImage && (
            <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-lg bg-sunken">
              <Image src={post.featuredImage} alt={post.featuredAlt ?? ""} fill priority sizes="(min-width: 768px) 48rem, 100vw" className="object-cover" />
            </div>
          )}

          {headings.length >= 3 && (
            <nav aria-label="In this article" className="mt-8 rounded-lg border border-line bg-surface p-5">
              <Eyebrow>In this article</Eyebrow>
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
                {headings.map((h) => (
                  <li key={h.id}>
                    <a href={`#${h.id}`} className="text-navy-600 underline-offset-4 hover:underline">
                      {h.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          <div className="mt-8 space-y-5 text-[1.0625rem] leading-relaxed">
            {blocks.map((b, i) =>
              b.type === "heading" ? (
                <h2 key={i} id={b.id} className="scroll-mt-24 pt-4 text-title">
                  {b.text}
                </h2>
              ) : b.type === "list" ? (
                <ul key={i} className="list-disc space-y-1.5 pl-6">
                  {b.items.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p key={i}>{b.text}</p>
              ),
            )}
          </div>

          <Card className="mt-12">
            <CardBody className="flex flex-wrap items-center justify-between gap-4">
              <p className="max-w-md text-sm">
                <strong className="text-strong">Sizing a system for your home?</strong> List your appliances and see the inverter, batteries and panels you need, with prices.
              </p>
              <Link href="/solar-quote" className={buttonClass({ variant: "primary" })}>
                Get a free solar quote
              </Link>
            </CardBody>
          </Card>

          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <span className="text-muted">Share:</span>
            <a href={`https://wa.me/?text=${encodeURIComponent(`${post.title} ${url}`)}`} target="_blank" rel="noopener noreferrer" className="text-navy-600 underline underline-offset-4">
              WhatsApp
            </a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" className="text-navy-600 underline underline-offset-4">
              Facebook
            </a>
            <a href={`https://x.com/intent/post?url=${encodeURIComponent(url)}&text=${encodeURIComponent(post.title)}`} target="_blank" rel="noopener noreferrer" className="text-navy-600 underline underline-offset-4">
              X
            </a>
          </div>
        </Container>
      </Section>

      {related.length > 0 && (
        <Section tone="surface">
          <Container className="max-w-3xl">
            <Eyebrow>Read next</Eyebrow>
            <ul className="mt-4 space-y-3">
              {related.map((r) => (
                <li key={r.id}>
                  <Link href={`/blog/${r.slug}`} className="font-medium text-strong hover:underline">
                    {r.title}
                  </Link>
                  {r.excerpt && <p className="text-sm text-muted">{r.excerpt}</p>}
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      )}
    </>
  );
}

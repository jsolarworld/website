import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Badge, Card, CardBody, Container, Eyebrow, Notice, Price, Section, SpecList, buttonClass } from "@/components/ui";
import { effectivePrice, getProduct, stockStatus } from "@/lib/catalogue";
import { db } from "@/lib/db";
import { SITE, formatNaira, jsonLd, whatsappLink } from "@/lib/site";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

const TONE = { in: "positive", low: "warning", out: "danger", request: "neutral" } as const;
const AVAILABILITY = {
  in: "https://schema.org/InStock",
  low: "https://schema.org/LimitedAvailability",
  out: "https://schema.org/OutOfStock",
  request: "https://schema.org/PreOrder",
} as const;

interface SpecField {
  key: string;
  label: string;
  unit?: string;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  if (!p) return {};
  const image = p.images[0]?.url;
  return {
    title: p.seoTitle ?? p.name,
    description:
      p.seoDescription ??
      `${p.name} at ${formatNaira(effectivePrice(p))}. ${p.warranty ? `${p.warranty}. ` : ""}Sold and installed by J Solar World, Alaba International Market, Lagos.`,
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: { type: "website", title: p.name, images: image ? [image] : undefined },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) {
    // A renamed product keeps its old link working (PRD SEO-03).
    const moved = await db.redirect.findUnique({ where: { fromPath: `/products/${slug}` } });
    if (moved) permanentRedirect(moved.toPath);
    notFound();
  }

  const status = stockStatus(p);
  const price = effectivePrice(p);
  const onSale = p.salePriceNgn != null && p.salePriceNgn < p.priceNgn;
  const specs = (p.specs ?? {}) as Record<string, string | number>;
  const template = (p.category.specTemplate ?? []) as unknown as SpecField[];
  const specRows = template
    .filter((f) => specs[f.key] != null && specs[f.key] !== "")
    .map((f) => ({ label: f.label, value: f.unit ? `${specs[f.key]} ${f.unit}` : String(specs[f.key]) }));
  if (p.brand) specRows.unshift({ label: "Brand", value: p.brand.name });
  if (p.sku) specRows.push({ label: "SKU", value: p.sku });

  const url = `${SITE.url}/products/${p.slug}`;
  const structured = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.name,
      description: p.description ?? undefined,
      sku: p.sku ?? undefined,
      brand: p.brand ? { "@type": "Brand", name: p.brand.name } : undefined,
      image: p.images.map((i) => i.url),
      offers: {
        "@type": "Offer",
        url,
        priceCurrency: "NGN",
        price: price,
        availability: AVAILABILITY[status.key],
        seller: { "@type": "Organization", name: SITE.name },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Products", item: `${SITE.url}/products` },
        { "@type": "ListItem", position: 2, name: p.category.name, item: `${SITE.url}/categories/${p.category.slug}` },
        { "@type": "ListItem", position: 3, name: p.name, item: url },
      ],
    },
  ];

  return (
    <Section tone="page" className="py-8 sm:py-12">
      {structured.map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(d) }} />
      ))}
      <Container>
        <nav aria-label="Breadcrumb" className="text-sm text-muted">
          <Link href="/products" className="hover:text-strong">Products</Link>
          {" / "}
          <Link href={`/categories/${p.category.slug}`} className="hover:text-strong">{p.category.name}</Link>
        </nav>

        <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div>
            {p.images.length > 0 ? (
              <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto lg:grid lg:grid-cols-2 lg:overflow-visible">
                {p.images.map((img, i) => (
                  <li key={img.id} className={`relative aspect-square w-full shrink-0 snap-center rounded-lg border border-line bg-surface ${i === 0 ? "lg:col-span-2" : ""}`}>
                    <Image src={img.url} alt={img.alt} fill priority={i === 0} sizes="(min-width: 1024px) 50vw, 100vw" className="object-contain p-4" />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex aspect-square items-center justify-center rounded-lg border border-line bg-sunken text-subtle">
                Photo coming soon
              </div>
            )}
          </div>

          <div>
            {p.brand && <Eyebrow>{p.brand.name}</Eyebrow>}
            <h1 className="mt-2 text-display-3">{p.name}</h1>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Price amount={price} was={onSale ? p.priceNgn : null} size="xl" />
              <Badge tone={TONE[status.key]} dot>{status.label}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted">
              Price in naira, no VAT added. It is locked once your payment is confirmed.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {/* Cart and checkout are the next build step; until then WhatsApp is the way to buy. */}
              <a
                className={buttonClass({ variant: "primary", size: "lg" })}
                href={whatsappLink(`Hello ${SITE.shortName}, I want to buy: ${p.name} (${url})`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Order on WhatsApp
              </a>
              <Link href="/solar-quote" className={buttonClass({ variant: "outline", size: "lg" })}>
                Not sure it fits? Get a quote
              </Link>
            </div>

            {p.description && <p className="mt-8 leading-relaxed">{p.description}</p>}

            {p.packageSpec && p.components.length > 0 && (
              <Card className="mt-8">
                <CardBody>
                  <Eyebrow>What&apos;s in this package</Eyebrow>
                  <ul className="mt-3 space-y-2 text-sm">
                    {p.components.map((c) => (
                      <li key={c.id} className="flex justify-between gap-4">
                        <Link href={`/products/${c.component.slug}`} className="hover:underline">{c.component.name}</Link>
                        <span className="numeric text-muted">× {c.quantity}</span>
                      </li>
                    ))}
                  </ul>
                  {p.packageSpec.whatItCanPower && (
                    <p className="mt-4 text-sm text-muted">Can power: {p.packageSpec.whatItCanPower}</p>
                  )}
                </CardBody>
              </Card>
            )}

            {specRows.length > 0 && (
              <div className="mt-8">
                <Eyebrow>Specifications</Eyebrow>
                <SpecList items={specRows} className="mt-3" />
                {p.datasheetUrl && (
                  <a href={p.datasheetUrl} className={buttonClass({ variant: "link" })} target="_blank" rel="noopener noreferrer">
                    Download datasheet
                  </a>
                )}
              </div>
            )}

            <div className="mt-8 space-y-3">
              {p.warranty && <Notice tone="info" title="Warranty">{p.warranty}. Misuse, unauthorised modification or bad installation may void it.</Notice>}
              <Notice title="Delivery">
                We deliver to all 36 states; transport is paid by the buyer unless quoted otherwise. Or collect from our shop at {SITE.address}.
              </Notice>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}

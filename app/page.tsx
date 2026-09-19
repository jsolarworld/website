import Link from "next/link";
import { Card, CardBody, Container, Eyebrow, Rule, Section, SectionHeader, buttonClass } from "@/components/ui";
import { ProductCard } from "@/components/product-card";
import { getCategories, getFeaturedProducts } from "@/lib/catalogue";
import { SITE, jsonLd, telLink, whatsappLink } from "@/lib/site";

export const revalidate = 60;

const STEPS = [
  { n: "01", title: "List your appliances", body: "Tell us what you want to power: fans, TV, fridge, AC. Takes two minutes." },
  { n: "02", title: "Get a recommended system", body: "We size the inverter, batteries and panels and show you priced options." },
  { n: "03", title: "Buy or book installation", body: "Order online or collect in Alaba. Our engineers install and support you after." },
];

export default async function Home() {
  const [categories, featured] = await Promise.all([getCategories(), getFeaturedProducts(8)]);

  const localBusiness = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: SITE.name,
    url: SITE.url,
    telephone: `+234${SITE.phones[0].slice(1)}`,
    email: SITE.email,
    slogan: SITE.slogan,
    address: {
      "@type": "PostalAddress",
      streetAddress: "F-Line 1424, Ojo Alaba International Market",
      addressLocality: "Ojo",
      addressRegion: "Lagos",
      addressCountry: "NG",
    },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "00:00",
      closes: "23:59",
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(localBusiness) }} />

      <section className="relative overflow-hidden bg-chassis text-on-chassis">
        <div aria-hidden className="sun-bloom-dark pointer-events-none absolute inset-0" />
        <Container className="relative py-20 sm:py-28">
          <Eyebrow className="text-solar-400">{SITE.slogan}</Eyebrow>
          <h1 className="mt-4 max-w-3xl text-display-1 text-white">
            Power that stays on. Sized to your home.
          </h1>
          <Rule className="mt-7" />
          <p className="mt-6 max-w-xl text-base leading-relaxed text-on-chassis-muted">
            Inverters, lithium and tubular batteries, solar panels, street lights and complete systems, sold and
            installed from Alaba International Market, Lagos. We deliver to all 36 states.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/solar-quote" className={buttonClass({ variant: "primary", size: "lg" })}>
              Get a free solar quote
            </Link>
            <Link
              href="/products"
              className={buttonClass({
                variant: "outline",
                size: "lg",
                className: "border-line-on-chassis bg-transparent text-white hover:border-white/40 hover:bg-white/10 hover:text-white",
              })}
            >
              Shop products
            </Link>
          </div>
        </Container>
      </section>

      {categories.length > 0 && (
        <Section tone="page">
          <Container>
            <SectionHeader eyebrow="Shop by type" title="Everything for a working solar system" />
            <ul className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {categories.map((c) => (
                <li key={c.id}>
                  <Card interactive className="h-full">
                    <CardBody>
                      <h3 className="text-subtitle">
                        <Link href={`/categories/${c.slug}`} className="after:absolute after:inset-0">
                          {c.name}
                        </Link>
                      </h3>
                    </CardBody>
                  </Card>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      )}

      {featured.length > 0 && (
        <Section tone="sunken">
          <Container>
            <SectionHeader
              eyebrow="Featured"
              title="Popular right now"
              action={<Link href="/products" className={buttonClass({ variant: "outline" })}>All products</Link>}
            />
            <ul className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {featured.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} />
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      )}

      <Section tone="surface">
        <Container>
          <SectionHeader eyebrow="How it works" title="Not sure what you need? We'll size it for you." />
          <ol className="mt-8 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n}>
                <p className="font-display text-display-3 text-solar-600 numeric">{s.n}</p>
                <h3 className="mt-2 text-subtitle">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      <Section tone="chassis">
        <Container className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <Eyebrow className="text-solar-400">Visit us</Eyebrow>
            <h2 className="mt-2.5 text-display-3 text-white">Find us at Alaba International Market</h2>
            <address className="mt-4 text-base not-italic leading-relaxed">{SITE.address}</address>
            <p className="mt-1 text-sm text-on-chassis-muted">{SITE.hours}</p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <a
              href={telLink(SITE.phones[0])}
              className={buttonClass({ variant: "outline", size: "lg", className: "border-line-on-chassis bg-transparent text-white hover:bg-white/10 hover:text-white" })}
            >
              Call {SITE.phones[0]}
            </a>
            <a
              href={whatsappLink(`Hello ${SITE.shortName}, where exactly is your shop?`)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass({ variant: "outline", size: "lg", className: "border-line-on-chassis bg-transparent text-white hover:bg-white/10 hover:text-white" })}
            >
              Get directions on WhatsApp
            </a>
          </div>
        </Container>
      </Section>
    </>
  );
}

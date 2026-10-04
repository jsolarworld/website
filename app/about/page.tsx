import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardBody, Container, Eyebrow, Section, SectionHeader, SpecList, buttonClass } from "@/components/ui";
import { ContactForm } from "@/components/contact-form";
import { getBrands } from "@/lib/catalogue";
import { MAP_QUERY, SITE, jsonLd, localBusiness, mapsLink, telLink, whatsappLink } from "@/lib/site";

// The brand list follows the catalogue; nothing else here changes often.
export const revalidate = 600;

export const metadata: Metadata = {
  title: "About us and contact",
  description: `J Solar World Energy sells and installs inverters, batteries, solar panels and complete solar systems from ${SITE.address}. Call, WhatsApp or visit us.`,
  alternates: { canonical: "/about" },
};

// Only facts the owner has confirmed. The company story, years in business, a landmark and shop photos
// are still to come from him (CLAUDE.md, "Still open").
const REASONS = [
  { title: "No VAT added", body: "The price we quote is the price you pay for the goods." },
  { title: "Warranty on what we sell", body: "Up to 25 years on solar panels, 5 on lithium batteries and street lights, and 2 on inverters and tubular batteries." },
  { title: "Delivery to all 36 states", body: "Or collect free from our shop. We confirm the transport cost with you before anything is sent." },
  { title: "We install complete systems", body: "Our engineers install the systems we sell and confirm the design with you first." },
];

const WARRANTY = [
  { label: "Solar panels", value: "up to 25 years" },
  { label: "Lithium batteries", value: "up to 5 years" },
  { label: "Solar street lights", value: "up to 5 years" },
  { label: "Inverters", value: "up to 2 years" },
  { label: "Tubular batteries", value: "up to 2 years" },
];

export default async function AboutPage() {
  const brands = await getBrands();

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({ ...localBusiness, hasMap: mapsLink }) }} />

      <Section tone="surface" className="border-b border-line py-10 sm:py-14">
        <Container>
          <Eyebrow className="text-solar-700">About us</Eyebrow>
          <h1 className="mt-2 max-w-3xl text-display-2">{SITE.slogan}</h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted">
            {SITE.name} sells and installs solar equipment from our shop at {SITE.address}: inverters, lithium and tubular batteries, solar
            panels, street lights and complete systems. We deliver anywhere in Nigeria.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a className={buttonClass({ variant: "primary", size: "lg" })} href={whatsappLink(`Hello ${SITE.shortName}, `)} target="_blank" rel="noopener noreferrer">
              Chat on WhatsApp
            </a>
            <a className={buttonClass({ variant: "outline", size: "lg" })} href={telLink(SITE.phones[0])}>
              Call {SITE.phones[0]}
            </a>
          </div>
          <p className="mt-5 text-sm text-muted">Registered business name, CAC BN 9403389.</p>
        </Container>
      </Section>

      <Section tone="page">
        <Container>
          <SectionHeader eyebrow="Why buy from us" title="What you can count on" />
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {REASONS.map((r) => (
              <li key={r.title}>
                <Card className="h-full">
                  <CardBody>
                    <h3 className="text-subtitle">{r.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{r.body}</p>
                  </CardBody>
                </Card>
              </li>
            ))}
          </ul>

          <div className="mt-12 grid gap-10 lg:grid-cols-2">
            {brands.length > 0 && (
              <div>
                <Eyebrow>Brands we sell</Eyebrow>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {brands.map((b) => (
                    <li key={b.id}>
                      <Link href={`/products?brand=${b.slug}`} className="inline-block rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-strong hover:border-navy-600">
                        {b.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <Eyebrow>Warranty</Eyebrow>
              <SpecList items={WARRANTY} className="mt-4" />
              <p className="mt-3 text-sm text-muted">
                The exact terms are on each product page. <Link href="/returns-and-warranty" className="underline underline-offset-4">Returns and warranty</Link>
              </p>
            </div>
          </div>
        </Container>
      </Section>

      <Section tone="surface" id="contact">
        <Container>
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <SectionHeader eyebrow="Visit or contact us" title="Find our shop" />
              <dl className="mt-6 space-y-4 text-sm">
                <div>
                  <dt className="text-muted">Shop</dt>
                  <dd className="mt-0.5 font-medium text-strong">{SITE.address}</dd>
                </div>
                <div>
                  <dt className="text-muted">Opening hours</dt>
                  <dd className="mt-0.5 font-medium text-strong">{SITE.hours}</dd>
                </div>
                <div>
                  <dt className="text-muted">Phone</dt>
                  <dd className="mt-0.5 flex flex-wrap gap-x-4 font-medium text-strong">
                    {SITE.phones.map((p) => (
                      <a key={p} href={telLink(p)} className="numeric hover:underline">
                        {p}
                      </a>
                    ))}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Email</dt>
                  <dd className="mt-0.5 font-medium text-strong">
                    <a href={`mailto:${SITE.email}`} className="hover:underline">
                      {SITE.email}
                    </a>
                  </dd>
                </div>
              </dl>
              <div className="mt-6 overflow-hidden rounded-lg border border-line">
                <iframe
                  title={`Map of ${MAP_QUERY}`}
                  src={`https://www.google.com/maps?q=${encodeURIComponent(MAP_QUERY)}&output=embed`}
                  className="block aspect-[4/3] w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <a href={mapsLink} target="_blank" rel="noopener noreferrer" className={buttonClass({ variant: "link", className: "mt-2" })}>
                Open in Google Maps
              </a>
            </div>

            <div>
              <SectionHeader eyebrow="Send us a message" title="We'll get back to you" lead="Leave your number and what you need. We reply by call or WhatsApp." />
              <Card className="mt-6">
                <CardBody>
                  <ContactForm />
                </CardBody>
              </Card>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}

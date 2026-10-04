import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingForm } from "@/components/booking-form";
import { Card, CardBody, Container, Eyebrow, Section, buttonClass } from "@/components/ui";
import { SITE, formatNaira, jsonLd, whatsappLink } from "@/lib/site";
import { getService, getServices } from "@/lib/services";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = await getService((await params).slug);
  if (!s) return {};
  return { title: s.name, description: s.summary, alternates: { canonical: `/services/${s.slug}` } };
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params;
  const [service, services] = await Promise.all([getService(slug), getServices()]);
  if (!service) notFound();

  const structured = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description: service.summary,
    areaServed: "Nigeria",
    provider: { "@type": "LocalBusiness", name: SITE.name, url: SITE.url },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <Section tone="page" className="py-8 sm:py-12">
        <Container>
          <nav aria-label="Breadcrumb" className="text-sm text-muted">
            <Link href="/services" className="hover:text-strong">
              Services
            </Link>
          </nav>

          <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_28rem]">
            <div>
              <Eyebrow className="text-solar-700">Service</Eyebrow>
              <h1 className="mt-2 text-display-2">{service.name}</h1>
              <p className="mt-4 text-lg leading-relaxed">{service.summary}</p>
              {service.fromPriceNgn != null && <p className="mt-3 font-display text-title text-strong">From {formatNaira(service.fromPriceNgn)}</p>}
              {service.body && (
                <div className="mt-6 space-y-4 leading-relaxed text-muted">
                  {service.body.split(/\n{2,}/).map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              )}
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  className={buttonClass({ variant: "outline" })}
                  href={whatsappLink(`Hello ${SITE.shortName}, I have a question about: ${service.name}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ask on WhatsApp
                </a>
                <Link href="/solar-quote" className={buttonClass({ variant: "outline" })}>
                  Get a free solar quote
                </Link>
              </div>
            </div>

            <div id="book" className="scroll-mt-24">
              <Card>
                <CardBody>
                  <h2 className="text-title">Book a visit</h2>
                  <p className="mt-1 text-sm text-muted">We call you to confirm the day. Nothing is charged online.</p>
                  <div className="mt-5">
                    <BookingForm services={services.map((s) => ({ id: s.id, name: s.name }))} initialServiceId={service.id} />
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}

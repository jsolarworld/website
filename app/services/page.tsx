import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardBody, Container, Eyebrow, Section, buttonClass } from "@/components/ui";
import { getServices } from "@/lib/services";
import { formatNaira } from "@/lib/site";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Solar installation and services",
  description: "Solar system installation and site inspections from J Solar World, Alaba International Market, Lagos. Book online.",
  alternates: { canonical: "/services" },
};

export default async function ServicesPage() {
  const services = await getServices();

  return (
    <>
      <Section tone="surface" className="border-b border-line py-10 sm:py-14">
        <Container>
          <Eyebrow className="text-solar-700">Services</Eyebrow>
          <h1 className="mt-2 max-w-3xl text-display-2">Installed by the people who sold it to you</h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted">
            Book a visit online. We call you to confirm the day, and agree the price with you before any work starts.
          </p>
        </Container>
      </Section>

      <Section tone="page">
        <Container>
          {services.length === 0 ? (
            <p className="text-muted">Our services are being updated. Please call or WhatsApp us to book.</p>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {services.map((s) => (
                <li key={s.id}>
                  <Card className="h-full">
                    <CardBody className="flex h-full flex-col gap-3">
                      <h2 className="text-title">
                        <Link href={`/services/${s.slug}`} className="hover:underline">
                          {s.name}
                        </Link>
                      </h2>
                      <p className="leading-relaxed text-muted">{s.summary}</p>
                      {s.fromPriceNgn != null && <p className="text-sm text-strong">From {formatNaira(s.fromPriceNgn)}</p>}
                      <div className="mt-auto flex flex-wrap gap-3 pt-2">
                        <Link href={`/services/${s.slug}#book`} className={buttonClass({ variant: "chassis" })}>
                          Book
                        </Link>
                        <Link href={`/services/${s.slug}`} className={buttonClass({ variant: "outline" })}>
                          Learn more
                        </Link>
                      </div>
                    </CardBody>
                  </Card>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-10 text-sm text-muted">
            Not sure what you need?{" "}
            <Link href="/solar-quote" className="text-navy-600 underline underline-offset-4">
              Get a free solar quote
            </Link>{" "}
            from your list of appliances first.
          </p>
        </Container>
      </Section>
    </>
  );
}

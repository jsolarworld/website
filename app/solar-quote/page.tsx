import type { Metadata } from "next";
import { Container, Eyebrow } from "@/components/ui";
import { QuoteWizard, type ApplianceOption } from "@/components/quote/quote-wizard";
import { DEFAULT_HOURS } from "@/lib/quote/appliances";
import { db } from "@/lib/db";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Get a free solar quote",
  description:
    "List your appliances and get a recommended inverter, battery and solar panel setup with prices. Free, takes two minutes. J Solar World, Lagos.",
  alternates: { canonical: "/solar-quote" },
};

export default async function SolarQuotePage() {
  const rows = await db.appliance.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }] });
  const appliances: ApplianceOption[] = rows.map((a) => ({
    slug: a.slug,
    name: a.name,
    category: a.category,
    watts: a.watts,
    dutyCycle: a.dutyCycle,
    surge: a.surge,
    highDraw: a.highDraw,
    defaultHours: DEFAULT_HOURS[a.slug] ?? 5,
  }));

  return (
    <>
      <div className="border-b border-line bg-surface">
        <Container className="py-10 sm:py-12">
          <Eyebrow className="text-solar-700">Free solar quote</Eyebrow>
          <h1 className="mt-2.5 max-w-2xl text-display-2">What do you want to power?</h1>
          <p className="mt-3 max-w-xl text-muted">
            Pick your appliances. We&apos;ll work out the inverter, batteries and solar panels you need, and show you priced options.
          </p>
        </Container>
      </div>
      <QuoteWizard appliances={appliances} />
    </>
  );
}

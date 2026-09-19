import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, CardBody, Container, Eyebrow, Notice, Panel, Price, SpecFigure, buttonClass } from "@/components/ui";
import { getSavedQuote, isExpired } from "@/lib/quote/service";
import { quoteSummary } from "@/lib/quote/summary";
import type { QuoteView } from "@/lib/quote/view";
import { SITE, whatsappLink } from "@/lib/site";

type Props = { params: Promise<{ reference: string }> };

// A saved quote belongs to one customer: keep it out of search results.
export const metadata: Metadata = { title: "Your solar quote", robots: { index: false, follow: false } };

const dateFmt = new Intl.DateTimeFormat("en-NG", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Africa/Lagos" });

export default async function SavedQuotePage({ params }: Props) {
  const { reference } = await params;
  const quote = await getSavedQuote(reference.toUpperCase());
  if (!quote) notFound();

  const view = quote.result as unknown as QuoteView;
  const n = view.needs;
  const expired = isExpired(quote.validUntil);
  const url = `${SITE.url}/solar-quote/${quote.reference}`;

  return (
    <Container className="py-10 sm:py-14">
      <Eyebrow className="text-solar-700">Quote {quote.reference}</Eyebrow>
      <h1 className="mt-2 text-display-3">{quote.lead?.name ? `${quote.lead.name}'s solar quote` : "Your solar quote"}</h1>
      <p className="mt-2 text-sm text-muted">
        Prepared {dateFmt.format(quote.createdAt)} · {expired ? "expired" : `valid until ${dateFmt.format(quote.validUntil)}`}
      </p>

      {expired && (
        <Notice tone="warning" title="This quote has expired" className="mt-6">
          Prices change with the exchange rate. Message us and we&apos;ll confirm today&apos;s price.
        </Notice>
      )}

      <Panel className="mt-8 p-6 sm:p-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <SpecFigure onChassis label="Inverter" value={Math.ceil(n.inverterContinuousW).toLocaleString("en-NG")} unit="W or more" />
          <SpecFigure onChassis label="Used per day" value={(n.dailyWh / 1000).toFixed(1)} unit="kWh" />
          <SpecFigure onChassis label={`Battery for ${view.backupHours}h`} value={(n.batteryWh.lithium / 1000).toFixed(1)} unit="kWh lithium" note={`or ${(n.batteryWh.tubular / 1000).toFixed(1)} kWh tubular`} />
          <SpecFigure onChassis label="Solar array" value={Math.round(n.arrayW).toLocaleString("en-NG")} unit="W" />
        </div>
      </Panel>

      {view.options.length === 0 ? (
        <Card className="mt-6">
          <CardBody>
            <h2 className="text-title">Next step: site inspection</h2>
            <p className="mt-2 text-muted">Our engineer will contact you to size a system for this load.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {view.options.map((o) => (
            <Card key={o.packageId}>
              <CardBody className="space-y-3">
                <Badge tone={o.label === "Recommended" ? "solar" : "neutral"}>{o.label}</Badge>
                <h2 className="text-subtitle">{o.name}</h2>
                <Price amount={o.priceNgn} size="lg" />
                {o.backupHours != null && <p className="text-sm text-muted">About {o.backupHours.toFixed(1)} hours of backup</p>}
                <ul className="space-y-1 text-sm">
                  {o.components.map((c) => (
                    <li key={c.slug} className="flex justify-between gap-3">
                      <span>{c.name}</span>
                      <span className="numeric text-muted">× {c.quantity}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <a
          className={buttonClass({ variant: "primary" })}
          href={whatsappLink(`Hello ${SITE.shortName}, about my quote ${quote.reference}`)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Chat with us about this quote
        </a>
        <a
          className={buttonClass({ variant: "outline" })}
          href={`https://wa.me/?text=${encodeURIComponent(quoteSummary(view, quote.reference, url))}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Share on WhatsApp
        </a>
        <Link href="/solar-quote" className={buttonClass({ variant: "ghost" })}>
          Start a new quote
        </Link>
      </div>
      <p className="mt-6 text-sm text-muted">
        This is an estimate. The final design and price are confirmed after a site inspection by our engineers.
      </p>
    </Container>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, CardBody, Container, Eyebrow, Notice, Panel, Price, SpecFigure, buttonClass } from "@/components/ui";
import { AccessoriesList } from "@/components/quote/accessories-list";
import { BrandSystems } from "@/components/quote/brand-systems";
import { LeftOffNotice } from "@/components/quote/left-off-notice";
import { getSavedQuote, isExpired } from "@/lib/quote/service";
import { quoteSummary } from "@/lib/quote/summary";
import type { QuoteItem } from "@/lib/quote/types";
import { backupSentence, inverterKw, solarKw, type QuoteView } from "@/lib/quote/view";
import { SITE, formatNaira, whatsappLink } from "@/lib/site";

type Props = { params: Promise<{ reference: string }> };
/** `Quote.inputs` as `saveQuote` writes it. */
type SavedInputs = { items?: QuoteItem[]; state?: string; area?: string; budgetNgn?: number };

// A saved quote belongs to one customer: keep it out of search results.
export const metadata: Metadata = { title: "Your solar quote", robots: { index: false, follow: false } };

const dateFmt = new Intl.DateTimeFormat("en-NG", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Africa/Lagos" });

export default async function SavedQuotePage({ params }: Props) {
  const { reference } = await params;
  const quote = await getSavedQuote(reference.toUpperCase());
  if (!quote) notFound();

  const view = quote.result as unknown as QuoteView;
  const n = view.needs;
  // Quotes saved before brand systems existed have none.
  const systems = view.systems ?? [];
  const offered = systems.length > 0 || view.options.length > 0;

  // What the customer filled in, as saved with the quote (see `saveQuote`).
  const inputs = (quote.inputs ?? {}) as SavedInputs;
  const items = Array.isArray(inputs.items) ? inputs.items : [];
  const asked = [
    `Backup for ${view.backupHours} hours`,
    quote.chemistry === "LITHIUM" ? "Lithium batteries" : quote.chemistry === "TUBULAR" ? "Tubular batteries" : "Battery type left to us",
    inputs.budgetNgn ? `Budget ${formatNaira(inputs.budgetNgn)}` : null,
    [inputs.area, inputs.state].filter(Boolean).join(", ") || null,
  ].filter(Boolean);
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
          <SpecFigure onChassis label="Inverter" value={inverterKw(n.inverterContinuousW)} unit="kW or more" />
          <SpecFigure onChassis label="Used per day" value={(n.dailyWh / 1000).toFixed(1)} unit="kWh" />
          <SpecFigure onChassis label={`Battery for ${view.backupHours}h`} value={(n.batteryWh.lithium / 1000).toFixed(1)} unit="kWh lithium" note={`or ${(n.batteryWh.tubular / 1000).toFixed(1)} kWh tubular`} />
          <SpecFigure
            onChassis
            label="Solar"
            value={solarKw(n.arrayW)}
            unit="kW"
            // Quotes saved before 2026-10-15 carry no sun hours.
            note={n.peakSunHours ? `for ${n.peakSunHours} sun hours a day` : undefined}
          />
        </div>
      </Panel>

      {items.length > 0 && (
        <section className="mt-8">
          <h2 className="text-title">What you asked us to power</h2>
          <p className="mt-1 text-sm text-muted">{asked.join(" · ")}</p>
          <Card className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-4 py-2.5 font-medium">Appliance</th>
                  <th className="px-4 py-2.5 text-right font-medium">Qty</th>
                  <th className="px-4 py-2.5 text-right font-medium">Watts</th>
                  <th className="px-4 py-2.5 text-right font-medium">Hours a day</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((i, k) => (
                  <tr key={k}>
                    <td className="px-4 py-2.5">
                      <span className={i.onBackup ? "text-strong" : "text-muted"}>{i.name}</span>
                      {!i.onBackup && <span className="block text-xs text-muted">Stays on NEPA or generator</span>}
                      {i.onBackup && i.usageTime && i.usageTime !== "night" && (
                        <span className="block text-xs text-muted">{i.usageTime === "day" ? "Used mostly in the daytime" : "Used day and night"}</span>
                      )}
                    </td>
                    <td className="numeric px-4 py-2.5 text-right">{i.quantity}</td>
                    <td className="numeric px-4 py-2.5 text-right">{i.watts.toLocaleString("en-NG")}</td>
                    <td className="numeric px-4 py-2.5 text-right">{i.hoursPerDay}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>
      )}

      <LeftOffNotice names={view.leftOff} className="mt-6" />

      {view.options.length === 0 ? (
        systems.length === 0 && (
          <Card className="mt-6">
            <CardBody>
              <h2 className="text-title">Next step: site inspection</h2>
              <p className="mt-2 text-muted">Our engineer will contact you to size a system for this load.</p>
            </CardBody>
          </Card>
        )
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {view.options.map((o) => (
            <Card key={o.packageId}>
              <CardBody className="space-y-3">
                <Badge tone={o.label === "Recommended" ? "solar" : "neutral"}>{o.label}</Badge>
                <h2 className="text-subtitle">{o.name}</h2>
                <Price amount={o.priceNgn} size="lg" />
                {o.backupHours != null && <p className="text-sm text-muted">{backupSentence(o.backupHours, o.backupDays)}</p>}
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

      {systems.length > 0 && (
        <div className="mt-8">
          <BrandSystems systems={systems} reference={quote.reference} backupHours={view.backupHours} />
        </div>
      )}

      {offered && (
        <div className="mt-8">
          <AccessoriesList lines={view.accessories} />
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

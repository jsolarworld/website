import Link from "next/link";
import { Badge, Card, CardBody, Eyebrow, Price, buttonClass } from "@/components/ui";
import { fullyPriced } from "@/lib/quote/systems";
import { backupPhrase, type SystemView } from "@/lib/quote/view";
import { SITE, formatNaira, whatsappLink } from "@/lib/site";

const KIND_LABEL = { set: "Inverter with battery", separate: "Inverter and separate battery" } as const;

const pieces = (n: number) => `${n} ${n === 1 ? "piece" : "pieces"}`;

/** What the customer sends us on WhatsApp: the exact parts, so nobody has to look the quote up. */
function orderMessage(o: SystemView, reference?: string) {
  const parts = o.lines.map((l) => `${l.quantity} x ${l.name}`).join(", ");
  const price = fullyPriced(o) ? `Equipment total ${formatNaira(o.totalNgn)}.` : "Please send me the full price.";
  return `Hello ${SITE.shortName}, I'd like this ${o.brand} system from my quote${reference ? ` (${reference})` : ""}: ${parts}. ${price}`;
}

/**
 * Systems put together from the catalogue, grouped by brand, cheapest brand first. Used by the quote
 * wizard and the saved quote page. Nobody has checked these parts together, so the section says so.
 * A product with no price yet is listed as "Price on request" and left out of the total.
 */
export function BrandSystems({ systems, reference }: { systems: SystemView[]; reference?: string }) {
  if (systems.length === 0) return null;
  const brands = [...new Set(systems.map((o) => o.brand))];

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-title">Systems by brand</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          The devices you need, put together from what we stock to cover your whole list. Each one stays with a single brand, and an engineer
          confirms it before installation.
        </p>
      </div>

      {brands.map((brand) => (
        <div key={brand}>
          <Eyebrow>{brand}</Eyebrow>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            {systems
              .filter((o) => o.brand === brand)
              .map((o) => (
                <Card key={o.id} className="flex flex-col">
                  <CardBody className="flex flex-1 flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="brand">{KIND_LABEL[o.kind]}</Badge>
                      {o.id === systems[0].id && fullyPriced(o) && <Badge tone="solar">Lowest price</Badge>}
                      {o.overBudget && <Badge tone="warning">Above your budget</Badge>}
                    </div>

                    <ul className="divide-y divide-line text-sm">
                      {o.lines.map((l) => (
                        <li key={l.slug} className="flex items-baseline justify-between gap-4 py-2">
                          <span className="min-w-0">
                            <Link href={`/products/${l.slug}`} className="text-strong hover:underline">
                              {l.name}
                            </Link>
                            {/* Pieces and the price of one, so the amount on the right can be checked. */}
                            <span className="block text-xs text-muted numeric">
                              {pieces(l.quantity)}
                              {l.unitPriceNgn != null && ` × ${formatNaira(l.unitPriceNgn)}`}
                            </span>
                          </span>
                          {l.unitPriceNgn != null ? (
                            <span className="numeric shrink-0">{formatNaira(l.unitPriceNgn * l.quantity)}</span>
                          ) : (
                            <span className="shrink-0 text-muted">Price on request</span>
                          )}
                        </li>
                      ))}
                      <li className="flex items-baseline justify-between gap-4 py-2 text-muted">
                        <span>Accessories and installation</span>
                        <span className="shrink-0">Not in this total</span>
                      </li>
                    </ul>

                    <div className="mt-auto">
                      {fullyPriced(o) ? (
                        <>
                          <p className="text-xs text-muted">Equipment total</p>
                          <Price amount={o.totalNgn} size="lg" />
                        </>
                      ) : (
                        // No big figure here: a part total would read as the price of the whole system.
                        <>
                          <p className="font-display text-subtitle text-strong">Price on request</p>
                          {o.totalNgn > 0 && <p className="mt-1 text-sm text-muted">{formatNaira(o.totalNgn)} for the items priced above. Ask us for the rest.</p>}
                        </>
                      )}
                      <p className="mt-1 text-sm text-muted">
                        {(o.batteryWh / 1000).toFixed(1)} kWh {o.chemistry} battery
                        {o.backupHours != null && `, ${backupPhrase(o.backupHours)}`}
                      </p>
                    </div>

                    <a className={buttonClass({ variant: "outline", size: "sm" })} href={whatsappLink(orderMessage(o, reference))} target="_blank" rel="noopener noreferrer">
                      Ask about this system
                    </a>
                  </CardBody>
                </Card>
              ))}
          </div>
        </div>
      ))}
    </section>
  );
}

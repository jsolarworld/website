import Link from "next/link";
import { Card } from "@/components/ui";
import { pickAccessories, type AccessoryLine } from "@/lib/quote/accessories";
import { formatNaira } from "@/lib/site";

/**
 * The usual extras, listed under the systems and kept out of every total: which pieces and how many depend
 * on the site, so an engineer confirms them and only the price of one piece is shown. Used by the quote
 * wizard and the saved quote page; a quote saved before the list existed gets it without products.
 */
export function AccessoriesList({ lines = pickAccessories([]) }: { lines?: AccessoryLine[] }) {
  return (
    <section>
      <h2 className="text-title">Accessories most systems need</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Not in the totals above. Which of these you need, and how many, depend on your home, so our engineer confirms them. Prices are for one piece.
      </p>
      <Card className="mt-4">
        <ul className="divide-y divide-line px-5 text-sm">
          {lines.map((l) => (
            <li key={l.key} className="flex items-baseline justify-between gap-4 py-3">
              <span className="min-w-0">
                <span className="text-strong">{l.label}</span>
                {l.product && (
                  <Link href={`/products/${l.product.slug}`} className="block text-xs text-muted hover:underline">
                    {l.product.name}
                  </Link>
                )}
              </span>
              {l.product?.priceNgn != null ? (
                <span className="numeric shrink-0">{formatNaira(l.product.priceNgn)} each</span>
              ) : (
                <span className="shrink-0 text-muted">Price on request</span>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}

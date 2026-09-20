import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of sale",
  description: "The terms that apply when you buy from J Solar World Energy.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of sale" updated="20 September 2026">
      <section>
        <h2>Who we are</h2>
        <p>
          {SITE.name} is a registered business name (CAC BN 9403389) trading from {SITE.address}. When these terms say &quot;we&quot;, they mean {SITE.name}.
        </p>
      </section>

      <section>
        <h2>Prices</h2>
        <p>All prices are in Nigerian naira. We do not add VAT or any extra charge on top of the price shown. Delivery is not included and is arranged separately (see <Link href="/delivery">Delivery and installation</Link>). Prices can change with the exchange rate, so a price is locked for you only once your payment is confirmed. A saved quote is valid for the period shown on it.</p>
      </section>

      <section>
        <h2>Placing an order</h2>
        <p>
          When you place an order, we reserve the items for you for a limited time, shown on your order page, while you pay. If payment is not confirmed in that time, the order is cancelled and the items are released for sale. An order is accepted when we have confirmed your payment.
        </p>
      </section>

      <section>
        <h2>How you can pay</h2>
        <ul>
          <li>Online through Paystack (card, bank transfer or USSD). We confirm your payment directly with Paystack.</li>
          <li>By bank transfer to our account, shown on your order page. Upload your receipt, and we mark the order as paid once the money is in our account.</li>
        </ul>
        <p>We never see or store your card details.</p>
      </section>

      <section>
        <h2>Delivery, returns and warranty</h2>
        <p>
          See <Link href="/delivery">Delivery and installation</Link> and <Link href="/returns-and-warranty">Returns and warranty</Link>. Returns are accepted only for unopened, unused items on the day of purchase. Warranty periods depend on the product.
        </p>
      </section>

      <section>
        <h2>Quotes</h2>
        <p>The solar quote tool gives an estimate from the appliances you list. The final system design and price are confirmed after a site inspection by our engineers.</p>
      </section>

      <section>
        <h2>Contact and disputes</h2>
        <p>
          If something is wrong, tell us first: {SITE.phones.join(" or ")}, or {SITE.email}. These terms are governed by the laws of the Federal Republic of Nigeria.
        </p>
      </section>
    </LegalPage>
  );
}

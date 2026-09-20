import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { SITE, whatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Returns and warranty",
  description: "How returns and warranty claims work at J Solar World Energy, and how long each product is covered.",
  alternates: { canonical: "/returns-and-warranty" },
};

export default function ReturnsAndWarrantyPage() {
  return (
    <LegalPage title="Returns and warranty" updated="20 September 2026">
      <section>
        <h2>Returns</h2>
        <p>We accept a return only when the item is unopened and unused, and it is brought back on the same day you bought it. Items that have been opened, installed or used cannot be returned, but they are covered by the warranty below if they develop a fault.</p>
      </section>

      <section>
        <h2>Warranty</h2>
        <p>Cover depends on the product. These are the longest periods, and the exact terms for your item are shown on its product page.</p>
        <ul>
          <li>Solar panels: up to 25 years</li>
          <li>Lithium batteries: up to 5 years</li>
          <li>Solar street lights: up to 5 years</li>
          <li>Inverters: up to 2 years</li>
          <li>Tubular batteries: up to 2 years</li>
        </ul>
        <p>The warranty may be void if the fault is caused by misuse, incorrect handling, unauthorised modification, or bad installation.</p>
      </section>

      <section>
        <h2>Making a warranty claim</h2>
        <p>
          Message us on <a href={whatsappLink("Hello J Solar World, I need warranty support")}>WhatsApp</a> or call {SITE.phones[0]} with your order number (or a photo of your receipt) and a short description of the problem. Where an item is covered, we send an engineer or arrange for it to
          go to our after-sales service. We have after-sales engineers in major states across Nigeria.
        </p>
      </section>

      <section>
        <h2>Visit us</h2>
        <p>
          {SITE.address}. {SITE.hours}
        </p>
      </section>
    </LegalPage>
  );
}

import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Delivery and installation",
  description: "Nationwide delivery to all 36 states, collection from our Alaba shop, and installation of complete systems.",
  alternates: { canonical: "/delivery" },
};

export default function DeliveryPage() {
  return (
    <LegalPage title="Delivery and installation" updated="20 September 2026">
      <section>
        <h2>Collect from our shop</h2>
        <p>
          Collecting from {SITE.address} is free. {SITE.hours}
        </p>
      </section>

      <section>
        <h2>Delivery</h2>
        <p>
          We deliver to all 36 states of Nigeria. The buyer pays the transport cost unless we have quoted otherwise. We confirm the transport cost with you before dispatch, so you know it before anything leaves our shop. The price you pay online is for the goods only.
        </p>
      </section>

      <section>
        <h2>Installation</h2>
        <p>
          We install complete systems bought from us. The installation price depends on the system, and it is agreed with you before work starts. Delivery or transport is billed separately where it applies.
        </p>
      </section>
    </LegalPage>
  );
}

import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What personal information J Solar World Energy collects, why, who helps us handle it, and how to ask us to change or delete it.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="20 September 2026">
      <section>
        <h2>Who is responsible</h2>
        <p>
          {SITE.name} ({SITE.address}) decides how your personal information is used. This policy follows the Nigeria Data Protection Act 2023.
        </p>
      </section>

      <section>
        <h2>What we collect, and why</h2>
        <ul>
          <li>
            <strong>Orders:</strong> your name, phone, email, delivery address, the items you buy and your payment reference. We use these to take payment, deliver or hand over your order, and support you afterwards, including warranty.
          </li>
          <li>
            <strong>Quotes:</strong> the appliances you list, your area, and your phone number. We use these to size a system and to call or message you about your quote, but only if you tick the box to allow it.
          </li>
          <li>
            <strong>Transfer receipts:</strong> the image you upload as proof of a bank transfer, used only to confirm your payment.
          </li>
          <li>
            <strong>Messages:</strong> anything you send us through forms, WhatsApp or phone.
          </li>
        </ul>
        <p>We do not see or store your card number. Card and online payments are handled by Paystack.</p>
      </section>

      <section>
        <h2>Who helps us handle it</h2>
        <ul>
          <li>Paystack, to process online payments</li>
          <li>Cloudinary, to store product photos and transfer receipts</li>
          <li>Vercel, to host this website and measure visits</li>
          <li>Neon, to store our database</li>
        </ul>
        <p>We do not sell your information.</p>
      </section>

      <section>
        <h2>Cookies and visit statistics</h2>
        <p>
          We use one small cookie to remember what is in your cart. We use Vercel&apos;s visitor and speed measurements, which count visits without following you around the internet. Staff sign-in uses cookies to keep staff signed in.
        </p>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <p>We keep order and warranty records for as long as we need them to support you and to meet our record-keeping duties. Quote details you did not act on are kept for a shorter time.</p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>
          You can ask to see the information we hold about you, correct it, or have it deleted, and you can ask us to stop contacting you. Email <a href={`mailto:${SITE.email}`}>{SITE.email}</a> or call {SITE.phones[0]}. If you are not happy with our answer, you can complain to the Nigeria Data Protection Commission.
        </p>
      </section>
    </LegalPage>
  );
}

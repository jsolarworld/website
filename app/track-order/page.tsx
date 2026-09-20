import type { Metadata } from "next";
import { TrackForm } from "@/components/track-form";
import { Container, Section, SectionHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Track your order", alternates: { canonical: "/track-order" } };

export default function TrackOrderPage() {
  return (
    <Section tone="page" className="py-10 sm:py-14">
      <Container className="max-w-xl">
        <SectionHeader eyebrow="Orders" title="Track your order" lead="Enter your order number and the phone number or email you used at checkout." />
        <div className="mt-8">
          <TrackForm />
        </div>
      </Container>
    </Section>
  );
}

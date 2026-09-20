import type { ReactNode } from "react";
import { Container, Eyebrow, Section } from "@/components/ui";

/** Plain long-form page for policies. Content lives in each route file so it is easy to review and edit. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <Section tone="page" className="py-10 sm:py-14">
      <Container className="max-w-3xl">
        <Eyebrow className="text-solar-700">Policies</Eyebrow>
        <h1 className="mt-2 text-display-2">{title}</h1>
        <p className="mt-2 text-sm text-muted">Last updated {updated}</p>
        <div className="mt-8 space-y-8 text-[0.9375rem] leading-relaxed [&_h2]:mb-2 [&_h2]:text-title [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:text-navy-600 [&_a]:underline [&_a]:underline-offset-4">
          {children}
        </div>
      </Container>
    </Section>
  );
}

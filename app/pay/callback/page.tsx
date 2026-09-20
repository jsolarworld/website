import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Container, Notice, Section, buttonClass } from "@/components/ui";
import { tokenFor, verifyPaystackReference } from "@/lib/orders/service";

export const metadata: Metadata = { title: "Confirming payment", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ reference?: string; trxref?: string }> };

/**
 * Where Paystack sends the customer back. The redirect itself proves nothing: the payment counts only if
 * our own server-side verify call, with the secret key, says it succeeded for the right amount.
 */
export default async function PayCallback({ searchParams }: Props) {
  const sp = await searchParams;
  const reference = (sp.reference ?? sp.trxref ?? "").trim();
  if (!reference) redirect("/track-order");

  let check: Awaited<ReturnType<typeof verifyPaystackReference>> | null = null;
  try {
    check = await verifyPaystackReference(reference);
  } catch (e) {
    console.error("verify on callback failed", e);
  }

  if (check?.orderNumber) redirect(`/order/${check.orderNumber}?t=${tokenFor(check.orderNumber)}${check.state === "failed" ? "&pay=failed" : ""}`);

  return (
    <Section tone="page" className="py-16">
      <Container className="max-w-xl">
        <Notice tone="warning" title="We could not confirm your payment yet">
          If money left your account, do not pay again. Track your order with its number, and we will match the payment.
        </Notice>
        <div className="mt-6 flex gap-3">
          <Link href="/track-order" className={buttonClass({ variant: "primary" })}>
            Track my order
          </Link>
        </div>
      </Container>
    </Section>
  );
}

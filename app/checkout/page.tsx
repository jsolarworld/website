import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/checkout-form";
import { Container, Notice, Panel, Price, Section, SectionHeader, buttonClass } from "@/components/ui";
import { CART_COOKIE, parseCart } from "@/lib/orders/cart";
import { expireStaleOrders, loadCart } from "@/lib/orders/service";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };

export default async function CheckoutPage() {
  await expireStaleOrders().catch(() => null);
  const cart = await loadCart(parseCart((await cookies()).get(CART_COOKIE)?.value));
  if (cart.lines.length === 0) redirect("/cart");

  return (
    <Section tone="page" className="py-10 sm:py-14">
      <Container>
        <SectionHeader eyebrow="Checkout" title="Place your order" />
        {!cart.ok ? (
          <Notice tone="warning" className="mt-8" title="Some items in your cart need attention">
            <Link href="/cart" className={buttonClass({ variant: "link" })}>
              Go back to your cart
            </Link>
          </Notice>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
            <CheckoutForm paystackReady={Boolean(process.env.PAYSTACK_SECRET_KEY)} />
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <Panel className="p-5">
                <p className="font-display text-micro uppercase text-on-chassis-muted">Your order</p>
                <ul className="mt-3 space-y-2 text-sm">
                  {cart.lines.map((l) => (
                    <li key={l.productId} className="flex justify-between gap-3">
                      <span>
                        {l.name} <span className="text-on-chassis-muted">× {l.quantity}</span>
                      </span>
                      <span className="numeric">&#8358;{(l.unitPriceNgn * l.quantity).toLocaleString("en-NG")}</span>
                    </li>
                  ))}
                </ul>
                <hr className="my-4" />
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-on-chassis-muted">Total to pay now</span>
                  <Price amount={cart.subtotalNgn} size="lg" onChassis />
                </div>
                <p className="mt-3 text-xs text-on-chassis-muted">No VAT added. Your price is locked once payment is confirmed.</p>
              </Panel>
            </aside>
          </div>
        )}
      </Container>
    </Section>
  );
}

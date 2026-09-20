import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { Badge, Button, Container, EmptyState, Input, Notice, Panel, Price, Section, SectionHeader, buttonClass } from "@/components/ui";
import { CART_COOKIE, parseCart } from "@/lib/orders/cart";
import { expireStaleOrders, loadCart } from "@/lib/orders/service";
import { removeCartLine, updateCartLine } from "./actions";

export const metadata: Metadata = { title: "Your cart", robots: { index: false, follow: false } };

export default async function CartPage() {
  // Put back the stock of unpaid orders whose hold has run out, so this cart sees true availability.
  await expireStaleOrders().catch(() => null);
  const lines = parseCart((await cookies()).get(CART_COOKIE)?.value);
  const cart = await loadCart(lines);

  return (
    <Section tone="page" className="py-10 sm:py-14">
      <Container>
        <SectionHeader eyebrow="Cart" title="Your cart" />
        {cart.lines.length === 0 ? (
          <EmptyState
            className="mt-8"
            title="Your cart is empty"
            description="Browse our inverters, batteries and panels, or get a free quote and we'll suggest a full system."
            action={
              <div className="flex gap-2">
                <Link href="/products" className={buttonClass({ variant: "primary" })}>
                  Shop products
                </Link>
                <Link href="/solar-quote" className={buttonClass({ variant: "outline" })}>
                  Get a quote
                </Link>
              </div>
            }
          />
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
            <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
              {cart.lines.map((l) => (
                <li key={l.productId} className="flex flex-wrap items-center gap-4 p-4">
                  <div className="relative size-20 shrink-0 overflow-hidden rounded bg-sunken">
                    {l.imageUrl ? <Image src={l.imageUrl} alt={l.imageAlt} fill sizes="80px" className="object-contain p-1" /> : null}
                  </div>
                  <div className="min-w-[10rem] flex-1">
                    <Link href={`/products/${l.slug}`} className="font-medium text-strong hover:underline">
                      {l.name}
                    </Link>
                    <div className="mt-1">
                      <Price amount={l.unitPriceNgn} size="sm" />
                    </div>
                    {!l.available && (
                      <Badge tone="danger" className="mt-2">
                        {l.stock > 0 ? `Only ${l.stock} left` : "Out of stock"}
                      </Badge>
                    )}
                  </div>
                  <form action={updateCartLine} className="flex items-center gap-2">
                    <input type="hidden" name="productId" value={l.productId} />
                    <Input type="number" name="quantity" min={0} max={99} defaultValue={l.quantity} aria-label={`Quantity of ${l.name}`} className="h-10 w-20" />
                    <Button type="submit" variant="outline" size="sm">
                      Update
                    </Button>
                  </form>
                  <form action={removeCartLine}>
                    <input type="hidden" name="productId" value={l.productId} />
                    <Button type="submit" variant="ghost" size="sm">
                      Remove
                    </Button>
                  </form>
                </li>
              ))}
            </ul>

            <aside className="lg:sticky lg:top-24 lg:self-start">
              <Panel className="p-5">
                <p className="font-display text-micro uppercase text-on-chassis-muted">Subtotal</p>
                <div className="mt-2">
                  <Price amount={cart.subtotalNgn} size="lg" onChassis />
                </div>
                <p className="mt-3 text-sm text-on-chassis-muted">
                  No VAT added. Delivery is arranged and paid separately: we confirm the transport cost with you before dispatch. Collect from our shop for free.
                </p>
                {cart.ok ? (
                  <Link href="/checkout" className={buttonClass({ variant: "primary", block: true, className: "mt-5" })}>
                    Checkout
                  </Link>
                ) : (
                  <Notice tone="warning" className="mt-5">
                    Fix the items marked above (reduce the quantity or remove them) to continue.
                  </Notice>
                )}
              </Panel>
            </aside>
          </div>
        )}
      </Container>
    </Section>
  );
}

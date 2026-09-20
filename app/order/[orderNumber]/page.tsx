import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { retryPayment } from "@/app/order/actions";
import { ProofUpload } from "@/components/proof-upload";
import { Badge, Button, Card, CardBody, Container, Eyebrow, Notice, Panel, Price, Section, buttonClass } from "@/components/ui";
import { normalizeOrderNumber, STATUS_LABEL, type OrderStatus } from "@/lib/orders/rules";
import { getOrderByNumber, reconcileOrder, tokenOk } from "@/lib/orders/service";
import { getBank } from "@/lib/settings";
import { SITE, whatsappLink } from "@/lib/site";

// Belongs to one customer: never indexed.
export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };

type Props = { params: Promise<{ orderNumber: string }>; searchParams: Promise<{ t?: string; pay?: string }> };

const fmt = new Intl.DateTimeFormat("en-NG", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });
const TONE: Record<OrderStatus, "solar" | "positive" | "brand" | "danger" | "neutral"> = {
  PENDING_PAYMENT: "solar",
  PAID: "positive",
  PROCESSING: "brand",
  READY_FOR_PICKUP: "positive",
  OUT_FOR_DELIVERY: "brand",
  COMPLETED: "positive",
  CANCELLED: "danger",
  REFUNDED: "neutral",
};

export default async function OrderPage({ params, searchParams }: Props) {
  const orderNumber = normalizeOrderNumber((await params).orderNumber);
  const { t, pay } = await searchParams;
  // The order number alone is not enough: the link carries a token only the customer was given.
  if (!tokenOk(orderNumber, t)) notFound();

  let order = await getOrderByNumber(orderNumber);
  if (!order) notFound();
  // No webhooks: a customer who paid and closed the tab is caught here (and by the expiry sweep).
  if (order.status === "PENDING_PAYMENT") {
    await reconcileOrder(order.id);
    order = (await getOrderByNumber(orderNumber))!;
  }

  const status = order.status as OrderStatus;
  const transfer = order.payments.find((p) => p.method === "BANK_TRANSFER" && (p.status === "PENDING" || p.status === "PROOF_SUBMITTED"));
  const awaitingCard = status === "PENDING_PAYMENT" && !transfer;
  const bank = transfer ? await getBank() : null;
  const help = whatsappLink(`Hello ${SITE.shortName}, about my order ${order.orderNumber}`);

  return (
    <Section tone="page" className="py-10 sm:py-14">
      <Container className="max-w-3xl">
        <Eyebrow className="text-solar-700">Order {order.orderNumber}</Eyebrow>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-display-3">{status === "PENDING_PAYMENT" ? "Thank you. One more step." : status === "CANCELLED" ? "This order was cancelled" : "Thank you for your order"}</h1>
          <Badge tone={TONE[status]}>{STATUS_LABEL[status]}</Badge>
        </div>
        <p className="mt-2 text-sm text-muted">Placed {fmt.format(order.createdAt)}. Keep this page&apos;s link: it is how you come back to your order.</p>

        {pay === "failed" && (
          <Notice tone="warning" title="We could not open the payment page" className="mt-6">
            Nothing was charged. Try again below, or choose bank transfer by messaging us.
          </Notice>
        )}

        {awaitingCard && (
          <Card className="mt-6">
            <CardBody className="space-y-4">
              <h2 className="text-title">Complete your payment</h2>
              <p className="text-sm text-muted">
                Pay <strong className="text-strong">&#8358;{order.totalNgn.toLocaleString("en-NG")}</strong> securely with Paystack (card, bank transfer or USSD). Your items are held for you
                until {order.expiresAt ? fmt.format(order.expiresAt) : "payment"}.
              </p>
              <form action={retryPayment}>
                <input type="hidden" name="orderNumber" value={order.orderNumber} />
                <input type="hidden" name="token" value={t} />
                <Button type="submit" variant="primary" size="lg">
                  Pay now
                </Button>
              </form>
              <p className="text-xs text-muted">Already paid? Refresh this page in a minute: we check with Paystack automatically.</p>
            </CardBody>
          </Card>
        )}

        {transfer && bank && (
          <Panel className="mt-6 space-y-5 p-6">
            <div>
              <h2 className="text-title">Pay by bank transfer</h2>
              <p className="mt-1 text-sm text-on-chassis-muted">
                Transfer exactly this amount, then upload your receipt below. Your items are held until {order.expiresAt ? fmt.format(order.expiresAt) : "we confirm payment"}.
              </p>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="font-display text-micro uppercase text-on-chassis-muted">Amount</dt>
                <dd className="mt-1">
                  <Price amount={order.totalNgn} size="lg" onChassis />
                </dd>
              </div>
              <div>
                <dt className="font-display text-micro uppercase text-on-chassis-muted">Bank</dt>
                <dd className="mt-1 text-lg font-semibold text-white">{bank.bankName}</dd>
              </div>
              <div>
                <dt className="font-display text-micro uppercase text-on-chassis-muted">Account number</dt>
                <dd className="numeric mt-1 text-2xl font-bold tracking-wide text-white">{bank.accountNumber}</dd>
              </div>
              <div>
                <dt className="font-display text-micro uppercase text-on-chassis-muted">Account name</dt>
                <dd className="mt-1 text-lg font-semibold text-white">{bank.accountName}</dd>
              </div>
            </dl>
            <p className="text-sm text-on-chassis-muted">
              Use <strong className="text-white">{order.orderNumber}</strong> as the transfer narration or remark, so we can match your payment.
            </p>
          </Panel>
        )}
        {transfer && t && (
          <div className="mt-4">
            <ProofUpload orderNumber={order.orderNumber} token={t} alreadyUploaded={transfer.status === "PROOF_SUBMITTED"} />
          </div>
        )}

        <Card className="mt-6">
          <CardBody>
            <h2 className="text-title">Your items</h2>
            <ul className="mt-3 divide-y divide-line text-sm">
              {order.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-4 py-2">
                  <span>
                    {i.name} <span className="text-muted">× {i.quantity}</span>
                  </span>
                  <span className="numeric">&#8358;{(i.unitPriceNgn * i.quantity).toLocaleString("en-NG")}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between border-t border-line pt-3 font-semibold">
              <span>Total</span>
              <span className="numeric">&#8358;{order.totalNgn.toLocaleString("en-NG")}</span>
            </div>
            <p className="mt-4 text-sm text-muted">
              {order.fulfilment === "PICKUP"
                ? `Collect from ${SITE.address}. ${SITE.hours}`
                : `Delivery to ${[order.deliveryAddress, order.deliveryArea, order.deliveryState].filter(Boolean).join(", ")}. We will confirm the transport cost with you before dispatch.`}
            </p>
          </CardBody>
        </Card>

        {order.events.length > 0 && (
          <div className="mt-6">
            <Eyebrow>Progress</Eyebrow>
            <ol className="mt-3 space-y-2 text-sm">
              {order.events.map((e) => (
                <li key={e.id} className="flex gap-3">
                  <span className="numeric w-40 shrink-0 text-muted">{fmt.format(e.createdAt)}</span>
                  <span>{e.note ?? STATUS_LABEL[e.to as OrderStatus]}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <a href={help} target="_blank" rel="noopener noreferrer" className={buttonClass({ variant: "outline" })}>
            Message us about this order
          </a>
        </div>
      </Container>
    </Section>
  );
}

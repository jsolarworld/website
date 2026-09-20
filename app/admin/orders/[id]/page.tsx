import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderActions } from "@/components/admin/order-actions";
import { Badge, Card, CardBody, Container, Eyebrow, Notice } from "@/components/ui";
import { requireStaff } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { db } from "@/lib/db";
import { STATUS_LABEL, nextStatuses, type OrderStatus } from "@/lib/orders/rules";
import { formatNaira, telLink, whatsappLink } from "@/lib/site";

export const metadata = { title: "Order" };

const fmt = new Intl.DateTimeFormat("en-NG", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff("orders:read");
  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: { items: true, payments: { orderBy: { createdAt: "desc" } }, events: { orderBy: { createdAt: "asc" } } },
  });
  if (!order) notFound();

  const actorIds = [...new Set(order.events.map((e) => e.actorId).filter((x): x is string => Boolean(x)))];
  const actors = actorIds.length ? await db.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } }) : [];
  const actorName = new Map(actors.map((a) => [a.id, a.name]));

  const status = order.status as OrderStatus;
  const transfer = order.payments.find((p) => p.method === "BANK_TRANSFER" && (p.status === "PENDING" || p.status === "PROOF_SUBMITTED"));
  const paystackOpen = status === "PENDING_PAYMENT" && order.payments.some((p) => p.method === "PAYSTACK" && p.status === "PENDING");
  const late = order.events.some((e) => e.note?.startsWith("PAID AFTER EXPIRY"));

  return (
    <Container className="max-w-4xl py-8">
      <Link href="/admin/orders" className="text-sm text-muted hover:text-strong">
        ← All orders
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-bold">{order.orderNumber}</h1>
        <Badge tone={status === "CANCELLED" ? "danger" : status === "PENDING_PAYMENT" ? "solar" : "positive"}>{STATUS_LABEL[status]}</Badge>
      </div>
      <p className="mt-1 text-sm text-muted">Placed {fmt.format(order.createdAt)}</p>

      {late && (
        <Notice tone="danger" title="Paid after the hold expired" className="mt-5">
          The customer paid after their items were released, and some are now out of stock. Contact them to substitute or refund.
        </Notice>
      )}

      {can(staff.role, "orders:write") && (
        <div className="mt-6">
          <OrderActions orderId={order.id} next={nextStatuses(status)} transferWaiting={Boolean(transfer)} paystackOpen={paystackOpen} />
        </div>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardBody className="space-y-1 text-sm">
            <Eyebrow>Customer</Eyebrow>
            <p className="font-medium text-strong">{order.fullName}</p>
            <p>
              <a href={telLink(order.phone.replace("+234", "0"))} className="text-navy-600 underline">
                {order.phone}
              </a>{" "}
              ·{" "}
              <a href={whatsappLink("").replace(/wa\.me\/\d+/, `wa.me/${order.phone.replace("+", "")}`)} className="text-navy-600 underline" target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            </p>
            <p className="text-muted">{order.email}</p>
            <p className="pt-2 text-muted">
              {order.fulfilment === "PICKUP" ? "Collects at the shop" : [order.deliveryAddress, order.deliveryArea, order.deliveryState].filter(Boolean).join(", ")}
            </p>
            {order.landmark && <p className="text-muted">Landmark: {order.landmark}</p>}
            {order.notes && <p className="text-muted">Note: {order.notes}</p>}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-3 text-sm">
            <Eyebrow>Payments</Eyebrow>
            {order.payments.map((p) => (
              <div key={p.id} className="rounded-md bg-sunken p-3">
                <p className="font-medium text-strong">
                  {p.method === "PAYSTACK" ? "Paystack" : "Bank transfer"} · {formatNaira(p.amountNgn)} · {p.status.replace("_", " ").toLowerCase()}
                </p>
                {p.reference && <p className="font-mono text-xs text-muted">{p.reference}</p>}
                {p.proofUrl && (
                  <a href={p.proofUrl} target="_blank" rel="noopener noreferrer" className="text-navy-600 underline">
                    View uploaded receipt
                  </a>
                )}
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardBody>
          <Eyebrow>Items</Eyebrow>
          <ul className="mt-3 divide-y divide-line text-sm">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-4 py-2">
                <span>
                  {i.name} <span className="text-muted">× {i.quantity}</span>
                </span>
                <span className="numeric">{formatNaira(i.unitPriceNgn * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-line pt-3 font-semibold">
            <span>Total</span>
            <span className="numeric">{formatNaira(order.totalNgn)}</span>
          </div>
        </CardBody>
      </Card>

      <div className="mt-6">
        <Eyebrow>History</Eyebrow>
        <ol className="mt-3 space-y-2 text-sm">
          {order.events.map((e) => (
            <li key={e.id} className="flex flex-wrap gap-x-3">
              <span className="numeric w-40 shrink-0 text-muted">{fmt.format(e.createdAt)}</span>
              <span>
                {STATUS_LABEL[e.to as OrderStatus]}
                {e.note ? `: ${e.note}` : ""}
                {e.actorId && actorName.get(e.actorId) ? <span className="text-muted"> ({actorName.get(e.actorId)})</span> : null}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </Container>
  );
}

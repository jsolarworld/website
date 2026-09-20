import Link from "next/link";
import { Badge, Container, EmptyState } from "@/components/ui";
import { requireStaff } from "@/lib/admin/guard";
import { db } from "@/lib/db";
import { STATUS_LABEL, type OrderStatus } from "@/lib/orders/rules";
import { expireStaleOrders } from "@/lib/orders/service";
import { formatNaira } from "@/lib/site";
import type { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Orders" };

const STATUSES = Object.keys(STATUS_LABEL) as OrderStatus[];
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
const fmt = new Intl.DateTimeFormat("en-NG", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireStaff("orders:read");
  await expireStaleOrders().catch(() => null);
  const { status, q } = await searchParams;
  const filter = STATUSES.includes(status as OrderStatus) ? (status as OrderStatus) : undefined;

  const where: Prisma.OrderWhereInput = {
    ...(filter ? { status: filter } : {}),
    ...(q ? { OR: [{ orderNumber: { contains: q.toUpperCase() } }, { fullName: { contains: q, mode: "insensitive" } }, { phone: { contains: q.replace(/\D/g, "").slice(-10) || "x" } }, { email: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const [orders, waiting] = await Promise.all([
    db.order.findMany({ where, include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.payment.count({ where: { method: "BANK_TRANSFER", status: "PROOF_SUBMITTED", order: { status: "PENDING_PAYMENT" } } }),
  ]);

  return (
    <Container className="py-8">
      <h1 className="text-display-3">Orders</h1>
      {waiting > 0 && (
        <p className="mt-3 rounded-md bg-solar-50 px-4 py-3 text-sm text-solar-900">
          <strong>{waiting}</strong> bank transfer{waiting === 1 ? "" : "s"} with a receipt waiting for you to check the bank account.{" "}
          <Link href="/admin/orders?status=PENDING_PAYMENT" className="underline">
            Show unpaid orders
          </Link>
        </p>
      )}

      <form method="get" className="mt-5 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Order number, name, phone or email" className="h-11 w-full max-w-sm rounded-md border border-line-strong bg-surface px-3 text-sm" aria-label="Search orders" />
        {filter && <input type="hidden" name="status" value={filter} />}
        <button className="h-11 rounded-md bg-chassis px-5 text-sm font-semibold text-on-chassis">Search</button>
      </form>

      <nav className="mt-4 flex flex-wrap gap-2" aria-label="Filter by status">
        <Link href="/admin/orders" className={`rounded-full px-3 py-1 text-sm ${!filter ? "bg-chassis text-white" : "bg-sunken text-default"}`}>
          All
        </Link>
        {STATUSES.map((s) => (
          <Link key={s} href={`/admin/orders?status=${s}`} className={`rounded-full px-3 py-1 text-sm ${filter === s ? "bg-chassis text-white" : "bg-sunken text-default"}`}>
            {STATUS_LABEL[s]}
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <EmptyState className="mt-6" title="No orders yet" description="Orders placed on the website appear here." />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => {
                const pay = o.payments[0];
                return (
                  <tr key={o.id} className="hover:bg-sunken">
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${o.id}`} className="font-mono text-xs font-semibold text-navy-700 hover:underline">
                        {o.orderNumber}
                      </Link>
                      <p className="text-xs text-muted">{fmt.format(o.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      {o.fullName}
                      <p className="text-xs text-muted">{o.phone}</p>
                    </td>
                    <td className="numeric px-4 py-3 text-right">{formatNaira(o.totalNgn)}</td>
                    <td className="px-4 py-3 text-muted">
                      {pay ? `${pay.method === "PAYSTACK" ? "Paystack" : "Transfer"} · ${pay.status === "PROOF_SUBMITTED" ? "receipt uploaded" : pay.status.toLowerCase()}` : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={TONE[o.status as OrderStatus]}>{STATUS_LABEL[o.status as OrderStatus]}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Container>
  );
}

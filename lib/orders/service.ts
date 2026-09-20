import "server-only";
import { randomInt } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client";
import { effectivePrice } from "../catalogue";
import { db } from "../db";
import { getOrderSettings } from "../settings";
import type { CartLine } from "./cart";
import type { CheckoutInput } from "./checkout-form";
import { evaluateVerification, initializeTransaction, verifyTransaction } from "./paystack";
import { canTransition, makeOrderNumber, orderToken, orderTotals, verifyOrderToken, type OrderStatus } from "./rules";

/** A problem the customer can act on (item sold out, etc.). Everything else is an unexpected error. */
export class OrderError extends Error {}

export function orderSecret(): string {
  const s = process.env.BETTER_AUTH_SECRET;
  if (!s) throw new Error("BETTER_AUTH_SECRET is not set");
  return s;
}
export const tokenFor = (orderNumber: string) => orderToken(orderNumber, orderSecret());
export const tokenOk = (orderNumber: string, token: string | null | undefined) => verifyOrderToken(orderNumber, token, orderSecret());

// ─── Creating an order ───────────────────────────────────────────────────────

export interface CartView {
  lines: { productId: string; quantity: number; name: string; slug: string; unitPriceNgn: number; stock: number; available: boolean; imageUrl: string | null; imageAlt: string }[];
  subtotalNgn: number;
  /** True when every line can be bought as it stands. */
  ok: boolean;
}

/** The cart with live prices and stock. Lines whose product is gone or unpublished are dropped. */
export async function loadCart(lines: CartLine[]): Promise<CartView> {
  if (lines.length === 0) return { lines: [], subtotalNgn: 0, ok: false };
  const products = await db.product.findMany({
    where: { id: { in: lines.map((l) => l.productId) }, status: "PUBLISHED" },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  const view: CartView["lines"] = [];
  for (const l of lines) {
    const p = byId.get(l.productId);
    if (!p) continue;
    view.push({
      productId: p.id,
      quantity: l.quantity,
      name: p.name,
      slug: p.slug,
      unitPriceNgn: effectivePrice(p),
      stock: p.stock,
      available: !p.availableOnRequest && p.stock >= l.quantity,
      imageUrl: p.images[0]?.url ?? null,
      imageAlt: p.images[0]?.alt ?? p.name,
    });
  }
  const { subtotalNgn } = orderTotals(view);
  return { lines: view, subtotalNgn, ok: view.length > 0 && view.every((l) => l.available) };
}

/**
 * Create an order and reserve its stock in one transaction. Prices come from the database, never the client.
 * Stock is reserved with a conditional decrement, so two buyers can never both take the last unit.
 */
export async function createOrder(lines: CartLine[], input: CheckoutInput) {
  if (lines.length === 0) throw new OrderError("Your cart is empty.");
  const { holdHours } = await getOrderSettings();

  return db.$transaction(
    async (tx) => {
      const products = await tx.product.findMany({ where: { id: { in: lines.map((l) => l.productId) }, status: "PUBLISHED" } });
      const byId = new Map(products.map((p) => [p.id, p]));

      const priced: { productId: string; name: string; unitPriceNgn: number; quantity: number }[] = [];
      for (const l of lines) {
        const p = byId.get(l.productId);
        if (!p) throw new OrderError("An item in your cart is no longer available. Please review your cart.");
        if (p.availableOnRequest) throw new OrderError(`${p.name} is available on request. Please message us to order it.`);
        if (p.stock < l.quantity) throw new OrderError(p.stock > 0 ? `Only ${p.stock} of ${p.name} left.` : `${p.name} is out of stock.`);
        priced.push({ productId: p.id, name: p.name, unitPriceNgn: effectivePrice(p), quantity: l.quantity });
      }

      for (const item of priced) {
        const r = await tx.product.updateMany({ where: { id: item.productId, stock: { gte: item.quantity } }, data: { stock: { decrement: item.quantity } } });
        if (r.count !== 1) throw new OrderError(`${item.name} was just sold out. Please review your cart.`);
      }

      let orderNumber = "";
      for (let i = 0; i < 6; i++) {
        const candidate = makeOrderNumber(randomInt);
        if (!(await tx.order.findUnique({ where: { orderNumber: candidate }, select: { id: true } }))) {
          orderNumber = candidate;
          break;
        }
      }
      if (!orderNumber) throw new Error("Could not allocate an order number");

      const totals = orderTotals(priced);
      const now = new Date();
      const order = await tx.order.create({
        data: {
          orderNumber,
          status: "PENDING_PAYMENT",
          fullName: input.fullName,
          phone: input.phone,
          email: input.email,
          fulfilment: input.fulfilment,
          deliveryState: input.deliveryState,
          deliveryArea: input.deliveryArea,
          deliveryAddress: input.deliveryAddress,
          landmark: input.landmark,
          notes: input.notes,
          ...totals,
          expiresAt: new Date(now.getTime() + holdHours * 3_600_000),
          termsAcceptedAt: now,
          items: { create: priced.map((p) => ({ productId: p.productId, name: p.name, unitPriceNgn: p.unitPriceNgn, quantity: p.quantity })) },
          payments: {
            create: {
              method: input.method,
              amountNgn: totals.totalNgn,
              status: "PENDING",
              reference: input.method === "PAYSTACK" ? `${orderNumber}-${randomInt(1000, 9999)}` : null,
            },
          },
          events: { create: { to: "PENDING_PAYMENT", note: `Order placed (${input.method === "PAYSTACK" ? "card/online" : "bank transfer"})` } },
        },
        include: { payments: true },
      });
      return { order, payment: order.payments[0] };
    },
    { maxWait: 10_000, timeout: 30_000 },
  );
}

/** Start (or restart) a Paystack payment for an order and return the hosted payment page URL. */
export async function startPaystackPayment(orderId: string, callbackUrl: string): Promise<string> {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { payments: true } });
  if (!order || order.status !== "PENDING_PAYMENT") throw new OrderError("This order can no longer be paid.");

  // Reuse the open Paystack payment if there is one; otherwise open a fresh reference (a retry).
  let payment = order.payments.find((p) => p.method === "PAYSTACK" && p.status === "PENDING");
  if (!payment) {
    payment = await db.payment.create({
      data: { orderId, method: "PAYSTACK", amountNgn: order.totalNgn, status: "PENDING", reference: `${order.orderNumber}-${randomInt(1000, 9999)}-${randomInt(100, 999)}` },
    });
  }
  const init = await initializeTransaction({
    email: order.email,
    amountNgn: payment.amountNgn,
    reference: payment.reference!,
    callbackUrl,
    metadata: { orderNumber: order.orderNumber },
  });
  await db.payment.update({ where: { id: payment.id }, data: { gatewayResponse: { authorization_url: init.authorization_url } as Prisma.InputJsonValue } });
  return init.authorization_url;
}

// ─── Confirming payments ─────────────────────────────────────────────────────

type ConfirmResult = "confirmed" | "already";

/**
 * Mark a payment confirmed and its order paid. Idempotent: the conditional update means that verifying the same
 * reference twice (or from two tabs) produces exactly one Paid transition.
 */
export async function confirmPayment(paymentId: string, opts: { actorId?: string; gatewayResponse?: Prisma.InputJsonValue; note?: string } = {}): Promise<ConfirmResult> {
  return db.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({
      where: { id: paymentId, status: { in: ["PENDING", "PROOF_SUBMITTED"] } },
      data: { status: "CONFIRMED", confirmedAt: new Date(), confirmedById: opts.actorId ?? null, ...(opts.gatewayResponse ? { gatewayResponse: opts.gatewayResponse } : {}) },
    });
    if (claimed.count === 0) return "already";

    const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
    const order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId }, include: { items: true } });

    if (order.status === "PENDING_PAYMENT") {
      await tx.order.update({ where: { id: order.id }, data: { status: "PAID", paidAt: new Date(), expiresAt: null } });
      await tx.orderEvent.create({ data: { orderId: order.id, from: "PENDING_PAYMENT", to: "PAID", actorId: opts.actorId ?? null, note: opts.note ?? "Payment confirmed" } });
    } else if (order.status === "CANCELLED") {
      // Money arrived after the hold expired and the stock was released. Try to take the stock back.
      const taken: { productId: string; quantity: number }[] = [];
      let short = false;
      for (const item of order.items) {
        const r = await tx.product.updateMany({ where: { id: item.productId, stock: { gte: item.quantity } }, data: { stock: { decrement: item.quantity } } });
        if (r.count === 1) taken.push(item);
        else short = true;
      }
      if (short) for (const t of taken) await tx.product.update({ where: { id: t.productId }, data: { stock: { increment: t.quantity } } });
      await tx.order.update({ where: { id: order.id }, data: { status: "PAID", paidAt: new Date(), expiresAt: null } });
      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          from: "CANCELLED",
          to: "PAID",
          actorId: opts.actorId ?? null,
          note: short ? "PAID AFTER EXPIRY and some items are now out of stock: contact the customer (substitute or refund)." : "Paid after the hold expired; stock was re-reserved.",
        },
      });
    }
    return "confirmed";
  });
}

export type PaymentCheck = { state: "paid" | "pending" | "failed" | "unknown"; orderNumber?: string; reason?: string };

/** Ask Paystack about one payment and apply the result. Safe to call repeatedly, from anywhere. */
export async function verifyPaystackReference(reference: string): Promise<PaymentCheck> {
  const payment = await db.payment.findUnique({ where: { reference }, include: { order: { select: { orderNumber: true } } } });
  if (!payment || payment.method !== "PAYSTACK") return { state: "unknown" };
  const orderNumber = payment.order.orderNumber;
  if (payment.status === "CONFIRMED") return { state: "paid", orderNumber };

  const data = await verifyTransaction(reference);
  const verdict = evaluateVerification({ reference, amountNgn: payment.amountNgn }, data);
  if (verdict.kind === "success") {
    await confirmPayment(payment.id, { gatewayResponse: data as unknown as Prisma.InputJsonValue, note: "Paystack payment verified" });
    return { state: "paid", orderNumber };
  }
  if (verdict.kind === "failed") {
    await db.payment.updateMany({ where: { id: payment.id, status: "PENDING" }, data: { status: "FAILED", gatewayResponse: (data ?? {}) as unknown as Prisma.InputJsonValue } });
    return { state: "failed", orderNumber, reason: verdict.reason };
  }
  return { state: "pending", orderNumber };
}

/** Re-check every open Paystack payment on an order (a customer who closed the tab before returning). */
export async function reconcileOrder(orderId: string): Promise<void> {
  const open = await db.payment.findMany({ where: { orderId, method: "PAYSTACK", status: "PENDING", reference: { not: null } }, select: { reference: true } });
  for (const p of open) {
    try {
      await verifyPaystackReference(p.reference!);
    } catch (e) {
      console.error("reconcile failed", p.reference, e);
    }
  }
}

// ─── Cancelling and expiring ─────────────────────────────────────────────────

/** Cancel an unpaid order and put its stock back. Returns false when it was not cancellable (already paid/cancelled). */
export async function cancelUnpaidOrder(orderId: string, opts: { actorId?: string; note: string }): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const r = await tx.order.updateMany({ where: { id: orderId, status: "PENDING_PAYMENT" }, data: { status: "CANCELLED", expiresAt: null } });
    if (r.count === 0) return false;
    const items = await tx.orderItem.findMany({ where: { orderId } });
    for (const i of items) await tx.product.update({ where: { id: i.productId }, data: { stock: { increment: i.quantity } } });
    // Payments are deliberately left as they are: if the customer pays or transfers after this, the payment must
    // still be accepted (see confirmPayment's paid-after-cancellation path) instead of being silently ignored.
    await tx.orderEvent.create({ data: { orderId, from: "PENDING_PAYMENT", to: "CANCELLED", actorId: opts.actorId ?? null, note: opts.note } });
    return true;
  });
}

/**
 * Cancel unpaid orders whose hold has run out. Orders with a transfer receipt waiting for staff are left alone.
 * Before cancelling, open Paystack payments are re-verified: without webhooks this is what catches a customer
 * who paid but never came back to the site.
 */
export async function expireStaleOrders(limit = 25): Promise<{ checked: number; cancelled: number }> {
  const stale = await db.order.findMany({
    where: { status: "PENDING_PAYMENT", expiresAt: { lt: new Date() }, payments: { none: { status: "PROOF_SUBMITTED" } } },
    select: { id: true },
    take: limit,
  });
  let cancelled = 0;
  for (const o of stale) {
    await reconcileOrder(o.id);
    if (await cancelUnpaidOrder(o.id, { note: "Cancelled: unpaid after the hold time" })) cancelled++;
  }
  return { checked: stale.length, cancelled };
}

// ─── Staff status changes ────────────────────────────────────────────────────

export async function changeOrderStatus(orderId: string, to: OrderStatus, actorId: string, note?: string): Promise<string | null> {
  const order = await db.order.findUnique({ where: { id: orderId }, select: { status: true } });
  if (!order) return "Order not found.";
  const from = order.status as OrderStatus;
  if (!canTransition(from, to)) return `An order that is "${from.toLowerCase().replace(/_/g, " ")}" cannot move to "${to.toLowerCase().replace(/_/g, " ")}".`;
  if (to === "CANCELLED") return (await cancelUnpaidOrder(orderId, { actorId, note: note || "Cancelled by staff" })) ? null : "This order is no longer unpaid.";

  const r = await db.order.updateMany({ where: { id: orderId, status: from }, data: { status: to } });
  if (r.count !== 1) return "The order changed while you were working. Reload and try again.";
  await db.orderEvent.create({ data: { orderId, from, to, actorId, note: note || null } });
  return null;
}

// ─── Customer-facing lookups ─────────────────────────────────────────────────

export const getOrderByNumber = (orderNumber: string) =>
  db.order.findUnique({
    where: { orderNumber },
    include: { items: true, payments: { orderBy: { createdAt: "desc" } }, events: { orderBy: { createdAt: "asc" } } },
  });

/** Customer proves they own the order with its number plus the phone or email used at checkout. */
export async function findOrderForCustomer(orderNumber: string, contact: string) {
  const order = await db.order.findUnique({ where: { orderNumber }, select: { orderNumber: true, phone: true, email: true } });
  if (!order) return null;
  const c = contact.trim().toLowerCase();
  const digits = c.replace(/\D/g, "");
  const phoneMatch = digits.length >= 10 && order.phone.replace(/\D/g, "").endsWith(digits.slice(-10));
  return phoneMatch || order.email === c ? order.orderNumber : null;
}

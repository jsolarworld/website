import { createHmac, timingSafeEqual } from "node:crypto";

/** Money, order numbers, access tokens and the status machine. Pure, so every rule here is unit-tested. */

/** Whole naira to kobo, the unit Paystack expects. */
export const toKobo = (naira: number): number => Math.round(naira * 100);

export function orderTotals(lines: { unitPriceNgn: number; quantity: number }[], deliveryFeeNgn = 0, taxNgn = 0) {
  const subtotalNgn = lines.reduce((sum, l) => sum + l.unitPriceNgn * l.quantity, 0);
  return { subtotalNgn, deliveryFeeNgn, taxNgn, totalNgn: subtotalNgn + deliveryFeeNgn + taxNgn };
}

// No 0/O/1/I: an order number is read aloud over the phone and typed from a screenshot.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export function makeOrderNumber(random: (max: number) => number): string {
  return "JSW-" + Array.from({ length: 7 }, () => ALPHABET[random(ALPHABET.length)]).join("");
}
export const normalizeOrderNumber = (input: string): string => input.trim().toUpperCase().replace(/\s+/g, "");

/**
 * A link token that proves someone was given the order link (at checkout, or after checking phone/email).
 * HMAC of the order number with the server secret; the order number alone is not enough to view an order.
 */
export function orderToken(orderNumber: string, secret: string): string {
  return createHmac("sha256", secret).update(`order:${orderNumber}`).digest("base64url").slice(0, 24);
}
export function verifyOrderToken(orderNumber: string, token: string | undefined | null, secret: string): boolean {
  if (!token) return false;
  const expected = Buffer.from(orderToken(orderNumber, secret));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export type OrderStatus = "PENDING_PAYMENT" | "PAID" | "PROCESSING" | "READY_FOR_PICKUP" | "OUT_FOR_DELIVERY" | "COMPLETED" | "CANCELLED" | "REFUNDED";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Waiting for payment",
  PAID: "Paid",
  PROCESSING: "Being prepared",
  READY_FOR_PICKUP: "Ready for pickup",
  OUT_FOR_DELIVERY: "Out for delivery",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

// PRD 6.3. Payment moves an order to PAID only through the payment paths, never by a manual status pick.
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["CANCELLED"],
  PAID: ["PROCESSING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "REFUNDED"],
  PROCESSING: ["READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "REFUNDED"],
  READY_FOR_PICKUP: ["COMPLETED", "REFUNDED"],
  OUT_FOR_DELIVERY: ["COMPLETED", "REFUNDED"],
  COMPLETED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};
export const nextStatuses = (from: OrderStatus): OrderStatus[] => NEXT[from];
export const canTransition = (from: OrderStatus, to: OrderStatus): boolean => NEXT[from].includes(to);

/** Statuses in which the reserved stock has been released back to the shelf. */
export const RELEASES_STOCK = new Set<OrderStatus>(["CANCELLED"]);

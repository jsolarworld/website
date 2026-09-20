"use server";

import { redirect } from "next/navigation";
import { requestOrigin } from "@/lib/orders/origin";
import { normalizeOrderNumber } from "@/lib/orders/rules";
import { findOrderForCustomer, getOrderByNumber, startPaystackPayment, tokenFor, tokenOk } from "@/lib/orders/service";

/** Open a fresh Paystack payment for an unpaid order (the first attempt failed, or the customer left). */
export async function retryPayment(formData: FormData) {
  const orderNumber = normalizeOrderNumber(String(formData.get("orderNumber") ?? ""));
  const token = String(formData.get("token") ?? "");
  // The link token is the customer's proof that this is their order.
  if (!tokenOk(orderNumber, token)) redirect("/track-order");

  const order = await getOrderByNumber(orderNumber);
  if (!order || order.status !== "PENDING_PAYMENT") redirect(`/order/${orderNumber}?t=${token}`);

  let url: string | null = null;
  try {
    url = await startPaystackPayment(order.id, `${await requestOrigin()}/pay/callback`);
  } catch (e) {
    console.error("retryPayment failed", e);
  }
  redirect(url ?? `/order/${orderNumber}?t=${token}&pay=failed`);
}

export interface TrackState {
  error?: string;
}

/** Look an order up by its number plus the phone or email used at checkout, then send them to its link. */
export async function trackOrder(_prev: TrackState, formData: FormData): Promise<TrackState> {
  const orderNumber = normalizeOrderNumber(String(formData.get("orderNumber") ?? ""));
  const contact = String(formData.get("contact") ?? "");
  if (!orderNumber || !contact.trim()) return { error: "Enter your order number and the phone or email you used." };
  const found = await findOrderForCustomer(orderNumber, contact);
  // The same message whether the order or the contact was wrong, so numbers cannot be probed.
  if (!found) return { error: "We could not find an order with those details. Check the number and the phone or email you used." };
  redirect(`/order/${found}?t=${tokenFor(found)}`);
}

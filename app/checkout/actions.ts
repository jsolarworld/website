"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { CART_COOKIE, parseCart } from "@/lib/orders/cart";
import { parseCheckoutForm } from "@/lib/orders/checkout-form";
import { requestOrigin } from "@/lib/orders/origin";
import { OrderError, createOrder, startPaystackPayment, tokenFor } from "@/lib/orders/service";

export interface CheckoutState {
  errors?: Record<string, string>;
  error?: string;
}

// Unpaid orders reserve stock, so one person must not be able to reserve the whole shop.
const MAX_OPEN_ORDERS = 3;

export async function placeOrder(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  // Honeypot: a hidden field people never fill in.
  if (String(formData.get("website") ?? "") !== "") redirect("/");

  const jar = await cookies();
  const lines = parseCart(jar.get(CART_COOKIE)?.value);
  if (lines.length === 0) redirect("/cart");

  const parsed = parseCheckoutForm(formData);
  if (!parsed.ok) return { errors: parsed.errors };

  const open = await db.order.count({
    where: { status: "PENDING_PAYMENT", OR: [{ phone: parsed.data.phone }, { email: parsed.data.email }] },
  });
  if (open >= MAX_OPEN_ORDERS) {
    return { error: "You already have unpaid orders waiting. Please pay for one, or message us on WhatsApp and we will help." };
  }

  let orderId: string;
  let orderNumber: string;
  try {
    const { order } = await createOrder(lines, parsed.data);
    orderId = order.id;
    orderNumber = order.orderNumber;
  } catch (e) {
    if (e instanceof OrderError) return { error: e.message };
    console.error("placeOrder failed", e);
    return { error: "We could not place your order. Nothing was charged. Please try again." };
  }

  // The order exists: clear the cart so a refresh cannot place it twice.
  jar.set(CART_COOKIE, "[]", { path: "/", maxAge: 0 });
  const token = tokenFor(orderNumber);
  const orderPage = `/order/${orderNumber}?t=${token}`;

  if (parsed.data.method === "BANK_TRANSFER") redirect(orderPage);

  let payUrl: string | null = null;
  try {
    payUrl = await startPaystackPayment(orderId, `${await requestOrigin()}/pay/callback`);
  } catch (e) {
    console.error("paystack initialize failed", e);
  }
  // redirect() throws, so it stays outside the try block. On failure the order page offers a retry.
  redirect(payUrl ?? `${orderPage}&pay=failed`);
}

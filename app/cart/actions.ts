"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { CART_COOKIE, addLine, parseCart, removeLine, serializeCart, setQuantity, type CartLine } from "@/lib/orders/cart";

async function readCart(): Promise<CartLine[]> {
  return parseCart((await cookies()).get(CART_COOKIE)?.value);
}

async function writeCart(lines: CartLine[]) {
  // Not httpOnly on purpose: the header reads it to show the item count. It holds ids and quantities only, never prices.
  (await cookies()).set(CART_COOKIE, serializeCart(lines), {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: false,
  });
}

export async function addToCart(formData: FormData) {
  const productId = String(formData.get("productId") ?? "");
  const quantity = Number(formData.get("quantity") ?? 1);
  // Only products that can really be bought online go in the cart.
  const p = await db.product.findFirst({ where: { id: productId, status: "PUBLISHED", availableOnRequest: false, stock: { gt: 0 } }, select: { id: true } });
  if (p) await writeCart(addLine(await readCart(), p.id, quantity));
  redirect("/cart");
}

export async function updateCartLine(formData: FormData) {
  const productId = String(formData.get("productId") ?? "");
  await writeCart(setQuantity(await readCart(), productId, Number(formData.get("quantity"))));
  redirect("/cart");
}

export async function removeCartLine(formData: FormData) {
  await writeCart(removeLine(await readCart(), String(formData.get("productId") ?? "")));
  redirect("/cart");
}

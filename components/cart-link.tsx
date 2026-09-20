"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { CART_COOKIE, cartCount, parseCart } from "@/lib/orders/cart";

function readCount(): number {
  const m = document.cookie.split("; ").find((c) => c.startsWith(`${CART_COOKIE}=`));
  if (!m) return 0;
  try {
    return cartCount(parseCart(decodeURIComponent(m.slice(CART_COOKIE.length + 1))));
  } catch {
    return 0;
  }
}

const subscribe = (notify: () => void) => {
  window.addEventListener("focus", notify);
  return () => window.removeEventListener("focus", notify);
};

/** Header cart link with an item count read from the cart cookie. Re-reads on every navigation. */
export function CartLink() {
  usePathname(); // a navigation (e.g. the redirect after "Add to cart") re-renders this and refreshes the count
  const count = useSyncExternalStore(subscribe, readCount, () => 0);
  return (
    <Link href="/cart" className="relative rounded-md px-3 py-2 text-sm font-medium text-on-chassis hover:bg-white/10 hover:text-white" aria-label={`Cart, ${count} items`}>
      Cart
      {count > 0 && <span className="ml-1.5 rounded-full bg-solar-400 px-1.5 py-0.5 text-xs font-bold text-navy-900">{count}</span>}
    </Link>
  );
}

/**
 * The cart lives in a cookie: a JSON list of [productId, quantity]. It carries no prices. Everything in it is
 * untrusted input; prices, stock and availability are always re-read from the database.
 */

export const CART_COOKIE = "jsw_cart";
export const MAX_LINES = 30;
export const MAX_QTY = 99;

export type CartLine = { productId: string; quantity: number };

export function parseCart(raw: string | undefined | null): CartLine[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const seen = new Set<string>();
  const lines: CartLine[] = [];
  for (const item of data) {
    if (!Array.isArray(item)) continue;
    const [productId, quantity] = item;
    if (typeof productId !== "string" || productId.length === 0 || productId.length > 40 || seen.has(productId)) continue;
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1) continue;
    seen.add(productId);
    lines.push({ productId, quantity: Math.min(quantity, MAX_QTY) });
    if (lines.length >= MAX_LINES) break;
  }
  return lines;
}

export const serializeCart = (lines: CartLine[]): string => JSON.stringify(lines.map((l) => [l.productId, l.quantity]));

export function addLine(lines: CartLine[], productId: string, quantity: number): CartLine[] {
  const q = Math.max(1, Math.min(MAX_QTY, Math.floor(quantity) || 1));
  const existing = lines.find((l) => l.productId === productId);
  if (existing) return lines.map((l) => (l.productId === productId ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + q) } : l));
  return [...lines, { productId, quantity: q }].slice(0, MAX_LINES);
}

/** Set a line's quantity; a quantity below 1 removes it. */
export function setQuantity(lines: CartLine[], productId: string, quantity: number): CartLine[] {
  if (!Number.isFinite(quantity) || quantity < 1) return lines.filter((l) => l.productId !== productId);
  return lines.map((l) => (l.productId === productId ? { ...l, quantity: Math.min(MAX_QTY, Math.floor(quantity)) } : l));
}

export const removeLine = (lines: CartLine[], productId: string): CartLine[] => lines.filter((l) => l.productId !== productId);

export const cartCount = (lines: CartLine[]): number => lines.reduce((n, l) => n + l.quantity, 0);

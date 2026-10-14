/**
 * The extras most solar systems need besides the inverter, batteries and panels (owner decision,
 * 2026-10-14). The quote lists them under the systems, outside every total: which pieces and how many
 * depend on the site, so an engineer confirms them. Each shows the price of a matching catalogue product
 * once the shop has one, else "price on request". Pure, so it can be tested and drawn anywhere.
 */

/** Categories the accessories come from. */
export const ACCESSORY_CATEGORIES = ["accessories", "cables-and-components"];

/** A published, available product from one of those categories. */
export interface AccessoryRow {
  name: string;
  slug: string;
  /** Naira, each. Null when it has no price yet. */
  price: number | null;
  /** The product's "Type" spec, empty when not filled in. */
  type: string;
}

/** Matched against a product's type and name. Staff need one of these words in either for it to be found. */
export const ACCESSORY_KINDS: { key: string; label: string; match: RegExp }[] = [
  { key: "surge-protector", label: "Surge protector", match: /surge|\bspd\b/i },
  { key: "dc-breaker", label: "DC breaker", match: /\bdc\b.*\b(breaker|isolator|mcb)|\b(breaker|isolator|mcb)\b.*\bdc\b/i },
  { key: "ac-breaker", label: "AC breaker", match: /\bac\b.*\b(breaker|isolator|mcb)|\b(breaker|isolator|mcb)\b.*\bac\b/i },
  { key: "changeover", label: "Changeover switch", match: /change\s*-?\s*over/i },
  { key: "solar-cable", label: "Solar cable", match: /\b(solar|pv)\s*cable/i },
  { key: "battery-cable", label: "Battery cables", match: /battery\s*cable/i },
  { key: "mc4", label: "MC4 connectors", match: /\bmc4\b/i },
  // Not just "mount": a "wall-mounted" surge protector is not a mounting kit.
  { key: "mounting", label: "Panel mounting kit", match: /\bmount(ing)?\s*(kit|rails?|brackets?|structure|clamps?)\b|\bbrackets?\b|\brails?\b/i },
  // Not just "earth": an earth leakage breaker is protection, not an earthing kit.
  { key: "earthing", label: "Earthing kit", match: /\bearthing\b|\b(earth|ground(ing)?)\s*rods?\b/i },
];

export interface AccessoryLine {
  key: string;
  label: string;
  /** The product quoted for it: the cheapest one with a price, else one without. Null when the shop lists none. */
  product: { name: string; slug: string; priceNgn: number | null } | null;
}

export function pickAccessories(rows: AccessoryRow[]): AccessoryLine[] {
  return ACCESSORY_KINDS.map(({ key, label, match }) => {
    const found = rows.filter((r) => match.test(`${r.type} ${r.name}`));
    const best =
      found.filter((r) => r.price != null).sort((a, b) => a.price! - b.price! || a.name.localeCompare(b.name))[0] ??
      [...found].sort((a, b) => a.name.localeCompare(b.name))[0];
    return { key, label, product: best ? { name: best.name, slug: best.slug, priceNgn: best.price } : null };
  });
}

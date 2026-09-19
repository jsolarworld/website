/** URL slug: lowercase ascii, words joined by single hyphens. "12kVA Felicity Inverter (48V)" -> "12kva-felicity-inverter-48v". */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** First free slug: base, base-2, base-3 ... */
export function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
  const root = base || "item";
  if (!taken.has(root)) return root;
  for (let i = 2; ; i++) {
    const candidate = `${root}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
}

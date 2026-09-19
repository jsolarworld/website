import Link from "next/link";
import { Button, EmptyState, Field, Input, Select, buttonClass } from "@/components/ui";
import { ProductCard } from "@/components/product-card";
import { PAGE_SIZE, SORTS, listProducts, type SortKey } from "@/lib/catalogue";
import { SITE, whatsappLink } from "@/lib/site";

export interface ListingQuery {
  category?: string;
  brand?: string;
  q?: string;
  sort?: string;
  page?: string;
}

interface Option {
  slug: string;
  name: string;
}

/** Filter form (plain GET, works without JavaScript) plus the product grid and pagination. */
export async function ProductListing({
  basePath,
  query,
  categories,
  brands,
  lockedCategory,
}: {
  basePath: string;
  query: ListingQuery;
  categories: Option[];
  brands: Option[];
  /** Set on category pages, where the category is fixed by the URL. */
  lockedCategory?: string;
}) {
  const sort: SortKey = query.sort && query.sort in SORTS ? (query.sort as SortKey) : "newest";
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const category = lockedCategory ?? query.category;
  const { items, total, pages } = await listProducts({ category, brand: query.brand, q: query.q, sort, page });

  const pageHref = (n: number) => {
    const sp = new URLSearchParams();
    if (!lockedCategory && query.category) sp.set("category", query.category);
    if (query.brand) sp.set("brand", query.brand);
    if (query.q) sp.set("q", query.q);
    if (sort !== "newest") sp.set("sort", sort);
    if (n > 1) sp.set("page", String(n));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div>
      <form action={basePath} method="get" className="grid gap-4 rounded-lg border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-end">
        <Field name="q" label="Search" required={false}>
          {(f) => <Input {...f} type="search" defaultValue={query.q} placeholder="5kva, 200ah, Felicity…" />}
        </Field>
        {!lockedCategory && (
          <Field name="category" label="Category" required={false}>
            {(f) => (
              <Select {...f} defaultValue={query.category ?? ""}>
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        <Field name="brand" label="Brand" required={false}>
          {(f) => (
            <Select {...f} defaultValue={query.brand ?? ""}>
              <option value="">All brands</option>
              {brands.map((b) => (
                <option key={b.slug} value={b.slug}>
                  {b.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field name="sort" label="Sort by" required={false}>
          {(f) => (
            <Select {...f} defaultValue={sort}>
              {Object.entries(SORTS).map(([key, s]) => (
                <option key={key} value={key}>
                  {s.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Button type="submit" variant="chassis">
          Apply
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted" aria-live="polite">
        {total} {total === 1 ? "product" : "products"}
      </p>

      {items.length === 0 ? (
        <EmptyState
          className="mt-4"
          title="Nothing here yet"
          description="We're still adding our full catalogue. Tell us what you need and we'll confirm price and stock right away."
          action={
            <a
              className={buttonClass({ variant: "primary" })}
              href={whatsappLink(`Hello ${SITE.shortName}, I'm looking for ${query.q ?? "solar equipment"}.`)}
            >
              Ask on WhatsApp
            </a>
          }
        />
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {items.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-8 flex items-center justify-between">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className={buttonClass({ variant: "outline" })}>
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted">
            Page {page} of {pages} · {PAGE_SIZE} per page
          </span>
          {page < pages ? (
            <Link href={pageHref(page + 1)} className={buttonClass({ variant: "outline" })}>
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}

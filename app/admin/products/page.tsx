import Link from "next/link";
import { Badge, Button, Container, EmptyState, Field, Input, Select, buttonClass } from "@/components/ui";
import { requireStaff } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { effectivePrice, stockStatus } from "@/lib/catalogue";
import { db } from "@/lib/db";
import { formatNaira } from "@/lib/site";
import type { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Products" };

const PAGE = 50;
const STATUS_TONE = { PUBLISHED: "positive", DRAFT: "neutral", ARCHIVED: "warning" } as const;

type Search = { q?: string; status?: string; category?: string; kind?: string; page?: string };

export default async function AdminProducts({ searchParams }: { searchParams: Promise<Search> }) {
  const staff = await requireStaff("catalogue:read");
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.ProductWhereInput = {
    ...(sp.status === "PUBLISHED" || sp.status === "DRAFT" || sp.status === "ARCHIVED" ? { status: sp.status } : {}),
    ...(sp.kind === "PACKAGE" || sp.kind === "PRODUCT" ? { kind: sp.kind } : {}),
    ...(sp.category ? { category: { slug: sp.category } } : {}),
    ...(sp.q
      ? {
          OR: [
            { name: { contains: sp.q, mode: "insensitive" } },
            { sku: { contains: sp.q, mode: "insensitive" } },
            { brand: { name: { contains: sp.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [items, total, categories] = await Promise.all([
    db.product.findMany({
      where,
      include: { category: true, brand: true, packageSpec: { select: { approved: true } } },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE,
      take: PAGE,
    }),
    db.product.count({ where }),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const canWrite = can(staff.role, "catalogue:write");

  const href = (n: number) => {
    const q = new URLSearchParams(Object.entries(sp).filter(([k, v]) => k !== "page" && v) as [string, string][]);
    if (n > 1) q.set("page", String(n));
    return `/admin/products${q.size ? `?${q}` : ""}`;
  };

  return (
    <Container className="py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-display-3">Products</h1>
        {canWrite && (
          <Link href="/admin/products/new" className={buttonClass({ variant: "primary" })}>
            Add a product
          </Link>
        )}
      </div>

      <form method="get" className="mt-6 grid gap-3 rounded-lg border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-end">
        <Field name="q" label="Search" required={false}>
          {(f) => <Input {...f} type="search" defaultValue={sp.q} placeholder="Name, SKU or brand" />}
        </Field>
        <Field name="category" label="Category" required={false}>
          {(f) => (
            <Select {...f} defaultValue={sp.category ?? ""}>
              <option value="">All</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field name="status" label="Status" required={false}>
          {(f) => (
            <Select {...f} defaultValue={sp.status ?? ""}>
              <option value="">All</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </Select>
          )}
        </Field>
        <Field name="kind" label="Type" required={false}>
          {(f) => (
            <Select {...f} defaultValue={sp.kind ?? ""}>
              <option value="">All</option>
              <option value="PRODUCT">Products</option>
              <option value="PACKAGE">Packages</option>
            </Select>
          )}
        </Field>
        <Button type="submit" variant="chassis">
          Filter
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted">{total} found</p>

      {items.length === 0 ? (
        <EmptyState
          className="mt-4"
          title="No products yet"
          description="Add your first product, or import many at once from a CSV file."
          action={
            canWrite && (
              <div className="flex gap-2">
                <Link href="/admin/products/new" className={buttonClass({ variant: "primary" })}>
                  Add a product
                </Link>
                <Link href="/admin/products/import" className={buttonClass({ variant: "outline" })}>
                  Import CSV
                </Link>
              </div>
            )
          }
        />
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 text-right font-medium">Price</th>
                <th className="px-4 py-3 text-right font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((p) => {
                const st = stockStatus(p);
                return (
                  <tr key={p.id} className="hover:bg-sunken">
                    <td className="px-4 py-3">
                      <Link href={`/admin/products/${p.id}`} className="font-medium text-strong hover:underline">
                        {p.name}
                      </Link>
                      <p className="text-xs text-muted">
                        {[p.brand?.name, p.sku].filter(Boolean).join(" · ")}
                        {p.kind === "PACKAGE" && (
                          <Badge tone={p.packageSpec?.approved ? "positive" : "warning"} className="ml-2">
                            {p.packageSpec?.approved ? "Package · approved" : "Package · not approved"}
                          </Badge>
                        )}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-muted">{p.category.name}</td>
                    <td className="numeric px-4 py-3 text-right">{formatNaira(effectivePrice(p))}</td>
                    <td className="numeric px-4 py-3 text-right">
                      {p.availableOnRequest ? "On request" : p.stock}
                      {st.key === "low" && <span className="ml-1 text-ember-700">low</span>}
                      {st.key === "out" && <span className="ml-1 text-alert-600">out</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[p.status]}>{p.status.toLowerCase()}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav className="mt-6 flex items-center justify-between" aria-label="Pagination">
          {page > 1 ? <Link href={href(page - 1)} className={buttonClass({ variant: "outline" })}>Previous</Link> : <span />}
          <span className="text-sm text-muted">
            Page {page} of {pages}
          </span>
          {page < pages ? <Link href={href(page + 1)} className={buttonClass({ variant: "outline" })}>Next</Link> : <span />}
        </nav>
      )}
    </Container>
  );
}

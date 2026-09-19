import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm, type ProductFormInitial } from "@/components/admin/product-form";
import { Container, Notice } from "@/components/ui";
import { requireStaff } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import type { SpecField } from "@/lib/admin/product-form";
import { db } from "@/lib/db";

export const metadata = { title: "Edit product" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; kind?: string; category?: string }>;
};

const s = (v: number | null | undefined) => (v == null ? "" : String(v));

export default async function EditProductPage({ params, searchParams }: Props) {
  const staff = await requireStaff("catalogue:read");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const isNew = id === "new";
  // Writers get the form; read-only roles are sent back to the list.
  const canWrite = can(staff.role, "catalogue:write");

  const [categories, brands, product] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.brand.findMany({ orderBy: { name: "asc" } }),
    isNew ? null : db.product.findUnique({ where: { id }, include: { images: { orderBy: { sortOrder: "asc" } }, packageSpec: true, components: true } }),
  ]);
  if (!isNew && !product) notFound();
  if (isNew && !canWrite) return notFound();

  const preselect = categories.find((c) => c.slug === sp.category)?.id ?? "";
  const kind = product?.kind ?? (sp.kind === "package" ? "PACKAGE" : "PRODUCT");

  const componentOptions =
    kind === "PACKAGE"
      ? (await db.product.findMany({ where: { kind: "PRODUCT" }, select: { id: true, name: true, sku: true }, orderBy: { name: "asc" } }))
      : [];

  const initial: ProductFormInitial = {
    id: product?.id ?? "",
    kind,
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    sku: product?.sku ?? "",
    description: product?.description ?? "",
    categoryId: product?.categoryId ?? preselect,
    brandId: product?.brandId ?? "",
    priceNgn: s(product?.priceNgn),
    salePriceNgn: s(product?.salePriceNgn),
    stock: product ? String(product.stock) : "0",
    lowStockThreshold: product ? String(product.lowStockThreshold) : "2",
    availableOnRequest: product?.availableOnRequest ?? false,
    warranty: product?.warranty ?? "",
    weightKg: s(product?.weightKg),
    datasheetUrl: product?.datasheetUrl ?? "",
    status: product?.status ?? "DRAFT",
    featured: product?.featured ?? false,
    seoTitle: product?.seoTitle ?? "",
    seoDescription: product?.seoDescription ?? "",
    specs: (product?.specs ?? {}) as Record<string, string | number>,
    images: product?.images.map((i) => ({ url: i.url, alt: i.alt })) ?? [],
    pkg: {
      chemistry: product?.packageSpec?.chemistry ?? "LITHIUM",
      inverterContinuousW: s(product?.packageSpec?.inverterContinuousW),
      inverterSurgeW: s(product?.packageSpec?.inverterSurgeW),
      batteryWh: s(product?.packageSpec?.batteryWh),
      arrayW: s(product?.packageSpec?.arrayW),
      whatItCanPower: product?.packageSpec?.whatItCanPower ?? "",
      approved: product?.packageSpec?.approved ?? false,
      components: product?.components.map((c) => ({ componentId: c.componentId, quantity: c.quantity })) ?? [],
    },
  };

  return (
    <Container className="max-w-3xl py-8">
      <Link href="/admin/products" className="text-sm text-muted hover:text-strong">
        ← All products
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-display-3">{isNew ? (kind === "PACKAGE" ? "New package" : "New product") : product!.name}</h1>
        {!isNew && product!.status === "PUBLISHED" && (
          <Link href={`/products/${product!.slug}`} className="text-sm text-navy-600 underline underline-offset-4" target="_blank">
            View on the website
          </Link>
        )}
      </div>

      {isNew && (
        <p className="mt-2 text-sm text-muted">
          {kind === "PACKAGE" ? (
            <>
              Making a package. <Link href="/admin/products/new" className="underline">Make a single product instead</Link>
            </>
          ) : (
            <>
              Making a single product. <Link href="/admin/products/new?kind=package" className="underline">Make a package instead</Link>
            </>
          )}
        </p>
      )}
      {sp.saved && <Notice tone="positive" className="mt-6">Saved.</Notice>}

      <div className="mt-8">
        {canWrite ? (
          <ProductForm
            initial={initial}
            categories={categories.map((c) => ({ id: c.id, name: c.name, specTemplate: (c.specTemplate ?? []) as unknown as SpecField[] }))}
            brands={brands.map((b) => ({ id: b.id, name: b.name }))}
            componentOptions={componentOptions}
            canApprove={can(staff.role, "packages:approve")}
            isEdit={!isNew}
          />
        ) : (
          <Notice>Your role can view products but not edit them.</Notice>
        )}
      </div>
    </Container>
  );
}

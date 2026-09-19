import Link from "next/link";
import { BulkPriceForm } from "@/components/admin/bulk-price-form";
import { Container } from "@/components/ui";
import { requireStaff } from "@/lib/admin/guard";
import { db } from "@/lib/db";

export const metadata = { title: "Bulk price change" };

export default async function BulkPricesPage() {
  await requireStaff("catalogue:write");
  const [categories, brands] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <Container className="max-w-3xl py-8">
      <Link href="/admin/products" className="text-sm text-muted hover:text-strong">
        ← All products
      </Link>
      <h1 className="mt-2 text-display-3">Change many prices at once</h1>
      <p className="mt-2 text-muted">
        When the naira moves, raise or lower prices for a whole category or brand. You always see a preview first, and the change is recorded under your name.
        Quotes already saved keep the prices they were made with.
      </p>
      <div className="mt-8">
        <BulkPriceForm categories={categories} brands={brands} />
      </div>
    </Container>
  );
}

import Link from "next/link";
import { ImportForm } from "@/components/admin/import-form";
import { Container, Notice, buttonClass } from "@/components/ui";
import { requireStaff } from "@/lib/admin/guard";

export const metadata = { title: "Import products" };

export default async function ImportPage() {
  await requireStaff("catalogue:write");
  return (
    <Container className="max-w-3xl py-8">
      <Link href="/admin/products" className="text-sm text-muted hover:text-strong">
        ← All products
      </Link>
      <h1 className="mt-2 text-display-3">Import products from CSV</h1>
      <p className="mt-2 text-muted">
        Add or update many products at once. Start from the current catalogue so column names are right, edit it in Excel or Google Sheets,
        then upload it here.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <a href="/api/admin/products-csv?template=1" className={buttonClass({ variant: "outline", size: "sm" })}>
          Download a blank template
        </a>
        <a href="/api/admin/products-csv" className={buttonClass({ variant: "outline", size: "sm" })}>
          Download current products
        </a>
      </div>

      <Notice className="mt-6" title="How it works">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>sku</strong> is the key. A SKU that already exists is updated; a new SKU is added (it needs name, category and price).
          </li>
          <li>On updates, an empty cell leaves the value as it is. Nothing is ever deleted.</li>
          <li>
            <strong>category</strong> and <strong>brand</strong> must match the names already set up. Spec columns are called spec_ followed by the spec key, for
            example spec_ratedkva.
          </li>
          <li>New products are saved as draft unless the status column says published.</li>
          <li>If any row has a problem, nothing is imported until you fix it.</li>
        </ul>
      </Notice>

      <div className="mt-8">
        <ImportForm />
      </div>
    </Container>
  );
}

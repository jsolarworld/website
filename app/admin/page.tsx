import Link from "next/link";
import { Card, CardBody, Container, Eyebrow, Notice, SpecFigure, buttonClass } from "@/components/ui";
import { requireStaff } from "@/lib/admin/guard";
import { quoteGapIds } from "@/lib/admin/missing-service";
import { can } from "@/lib/admin/permissions";
import { db } from "@/lib/db";

export const metadata = { title: "Dashboard" };

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const staff = await requireStaff();
  const { denied } = await searchParams;
  const catalogue = can(staff.role, "catalogue:read");

  const [published, drafts, lowStock, newLeads, packages, unapproved, gaps, newBookings] = await Promise.all([
    db.product.count({ where: { status: "PUBLISHED" } }),
    db.product.count({ where: { status: "DRAFT" } }),
    // Prisma cannot compare two columns, so filter a bounded list in memory.
    db.product
      .findMany({ where: { status: "PUBLISHED", availableOnRequest: false }, select: { stock: true, lowStockThreshold: true } })
      .then((rows) => rows.filter((r) => r.stock <= r.lowStockThreshold).length),
    can(staff.role, "leads:read") ? db.lead.count({ where: { status: "NEW" } }) : Promise.resolve(null),
    db.product.count({ where: { kind: "PACKAGE", status: "PUBLISHED" } }),
    db.packageSpec.count({ where: { approved: false } }),
    // The same counts as the product list's "Missing" filter, so each card leads to exactly that list.
    catalogue
      ? Promise.all([
          db.product.count({ where: { priceNgn: null } }),
          db.product.count({ where: { media: { none: {} } } }),
          quoteGapIds().then((ids) => ids.length),
        ]).then(([price, photo, quote]) => [
          { key: "price", count: price, label: "No price yet", note: "Shown as “Price on request”" },
          { key: "photo", count: photo, label: "No photo or video", note: "Shown with a drawn picture" },
          { key: "quote", count: quote, label: "Missing quote tool details", note: "Price, brand or ratings" },
        ])
      : Promise.resolve([]),
    can(staff.role, "leads:read") ? db.serviceBooking.count({ where: { status: "NEW" } }) : Promise.resolve(null),
  ]);
  const toFinish = gaps.filter((g) => g.count > 0);

  return (
    <Container className="py-10">
      <h1 className="text-display-3">Hello, {staff.name.split(" ")[0]}</h1>
      {denied && (
        <Notice tone="warning" className="mt-6">
          Your role does not include that page.
        </Notice>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardBody>
            <SpecFigure label="Published products" value={published} note={`${drafts} in draft`} />
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <SpecFigure label="Low or out of stock" value={lowStock} />
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <SpecFigure label="Live packages" value={packages} note={unapproved > 0 ? `${unapproved} awaiting engineer approval` : "all approved"} />
          </CardBody>
        </Card>
        {newLeads !== null && (
          <Card interactive>
            <CardBody>
              <SpecFigure label="New leads" value={newLeads} note={newBookings ? `${newBookings} new service booking${newBookings === 1 ? "" : "s"}` : undefined} />
              <Link href={newBookings ? "/admin/bookings?status=NEW" : "/admin/leads?status=NEW"} className="mt-3 inline-block text-sm text-navy-600 underline underline-offset-4 after:absolute after:inset-0">
                {newBookings ? "See bookings" : "See leads"}
              </Link>
            </CardBody>
          </Card>
        )}
      </div>

      {toFinish.length > 0 && (
        <div className="mt-10">
          <Eyebrow>Products to finish</Eyebrow>
          <ul className="mt-3 grid gap-4 sm:grid-cols-3">
            {toFinish.map((g) => (
              <li key={g.key}>
                <Card interactive className="h-full">
                  <CardBody>
                    <SpecFigure label={g.label} value={g.count} note={g.note} />
                    <Link href={`/admin/products?missing=${g.key}`} className="mt-3 inline-block text-sm text-navy-600 underline underline-offset-4 after:absolute after:inset-0">
                      Show them
                    </Link>
                  </CardBody>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-10">
        <Eyebrow>Quick actions</Eyebrow>
        <div className="mt-3 flex flex-wrap gap-3">
          {can(staff.role, "catalogue:write") && (
            <>
              <Link href="/admin/products/new" className={buttonClass({ variant: "primary" })}>
                Add a product
              </Link>
              <Link href="/admin/products/import" className={buttonClass({ variant: "outline" })}>
                Import from CSV
              </Link>
            </>
          )}
          <Link href="/admin/products" className={buttonClass({ variant: "outline" })}>
            All products
          </Link>
        </div>
      </div>
    </Container>
  );
}

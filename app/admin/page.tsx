import Link from "next/link";
import { Card, CardBody, Container, Eyebrow, Notice, SpecFigure, buttonClass } from "@/components/ui";
import { requireStaff } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { db } from "@/lib/db";

export const metadata = { title: "Dashboard" };

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const staff = await requireStaff();
  const { denied } = await searchParams;

  const [published, drafts, lowStock, newLeads, packages, unapproved] = await Promise.all([
    db.product.count({ where: { status: "PUBLISHED" } }),
    db.product.count({ where: { status: "DRAFT" } }),
    // Prisma cannot compare two columns, so filter a bounded list in memory.
    db.product
      .findMany({ where: { status: "PUBLISHED", availableOnRequest: false }, select: { stock: true, lowStockThreshold: true } })
      .then((rows) => rows.filter((r) => r.stock <= r.lowStockThreshold).length),
    can(staff.role, "leads:read") ? db.lead.count({ where: { status: "NEW" } }) : Promise.resolve(null),
    db.product.count({ where: { kind: "PACKAGE", status: "PUBLISHED" } }),
    db.packageSpec.count({ where: { approved: false } }),
  ]);

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
          <Card>
            <CardBody>
              <SpecFigure label="New leads" value={newLeads} />
            </CardBody>
          </Card>
        )}
      </div>

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

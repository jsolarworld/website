import { revalidatePath } from "next/cache";
import Link from "next/link";
import { Badge, Button, Container, EmptyState, Eyebrow, Select } from "@/components/ui";
import { requireStaff } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { db } from "@/lib/db";
import { telLink } from "@/lib/site";
import type { BookingStatus } from "@/generated/prisma/client";

export const metadata = { title: "Bookings" };

const STATUSES: BookingStatus[] = ["NEW", "CONFIRMED", "SCHEDULED", "DONE", "CANCELLED"];
const LABEL: Record<BookingStatus, string> = { NEW: "New", CONFIRMED: "Confirmed", SCHEDULED: "Scheduled", DONE: "Done", CANCELLED: "Cancelled" };
const TONE = { NEW: "solar", CONFIRMED: "brand", SCHEDULED: "brand", DONE: "positive", CANCELLED: "neutral" } as const;

const dateFmt = new Intl.DateTimeFormat("en-NG", { weekday: "short", day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Lagos" });

async function setStatus(formData: FormData) {
  "use server";
  const staff = await requireStaff("leads:write");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as BookingStatus;
  if (!id || !STATUSES.includes(status)) return;
  const before = await db.serviceBooking.findUnique({ where: { id }, select: { status: true } });
  if (!before || before.status === status) return;
  await db.serviceBooking.update({ where: { id }, data: { status } });
  await db.auditLog.create({ data: { actorId: staff.id, action: "booking.status", entity: "ServiceBooking", entityId: id, before: { status: before.status }, after: { status } } });
  revalidatePath("/admin/bookings");
}

async function setPublished(formData: FormData) {
  "use server";
  const staff = await requireStaff("content:write");
  const id = String(formData.get("id") ?? "");
  const published = formData.get("published") === "true";
  const before = await db.service.findUnique({ where: { id }, select: { published: true, slug: true } });
  if (!before || before.published === published) return;
  await db.service.update({ where: { id }, data: { published } });
  await db.auditLog.create({ data: { actorId: staff.id, action: published ? "service.show" : "service.hide", entity: "Service", entityId: id, before: { published: before.published }, after: { published } } });
  revalidatePath("/admin/bookings");
  revalidatePath("/services");
  revalidatePath(`/services/${before.slug}`);
}

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const staff = await requireStaff("leads:read");
  const { status } = await searchParams;
  const filter = STATUSES.includes(status as BookingStatus) ? (status as BookingStatus) : undefined;
  const canWrite = can(staff.role, "leads:write");
  const canPublish = can(staff.role, "content:write");

  const [bookings, services] = await Promise.all([
    db.serviceBooking.findMany({
      where: filter ? { status: filter } : {},
      include: { service: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    canPublish ? db.service.findMany({ orderBy: { sortOrder: "asc" } }) : Promise.resolve([]),
  ]);

  return (
    <Container className="py-8">
      <h1 className="text-display-3">Bookings</h1>
      <nav className="mt-4 flex flex-wrap gap-2" aria-label="Filter by status">
        <Link href="/admin/bookings" className={`rounded-full px-3 py-1 text-sm ${!filter ? "bg-chassis text-white" : "bg-sunken text-default"}`}>
          All
        </Link>
        {STATUSES.map((s) => (
          <Link key={s} href={`/admin/bookings?status=${s}`} className={`rounded-full px-3 py-1 text-sm ${filter === s ? "bg-chassis text-white" : "bg-sunken text-default"}`}>
            {LABEL[s]}
          </Link>
        ))}
      </nav>

      {bookings.length === 0 ? (
        <EmptyState className="mt-6" title="No bookings yet" description="When someone books a service on the website, it appears here with their phone number and address." />
      ) : (
        <ul className="mt-6 space-y-3">
          {bookings.map((b) => (
            <li key={b.id} className="rounded-lg border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-strong">
                    {b.service.name} · {b.name}
                  </p>
                  <p className="numeric text-sm text-muted">
                    BK-{b.id.slice(-6).toUpperCase()} · booked {dateFmt.format(b.createdAt)}
                  </p>
                </div>
                <Badge tone={TONE[b.status]}>{LABEL[b.status]}</Badge>
              </div>
              <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                <div>
                  <dt className="inline text-muted">Wants: </dt>
                  <dd className="inline">
                    {b.preferredDate ? dateFmt.format(b.preferredDate) : "Soonest day"}
                    {b.timeWindow ? `, ${b.timeWindow.toLowerCase()}` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="inline text-muted">Where: </dt>
                  <dd className="inline">
                    {b.address}, {b.area}, {b.state}
                  </dd>
                </div>
                <div>
                  <dt className="inline text-muted">Phone: </dt>
                  <dd className="numeric inline">
                    <a href={telLink(b.phone.replace(/^\+234/, "0"))} className="text-navy-600 underline underline-offset-4">
                      {b.phone}
                    </a>
                    {" · "}
                    <a href={`https://wa.me/${b.phone.replace("+", "")}`} className="text-navy-600 underline underline-offset-4" target="_blank" rel="noopener noreferrer">
                      WhatsApp
                    </a>
                  </dd>
                </div>
                {b.email && (
                  <div>
                    <dt className="inline text-muted">Email: </dt>
                    <dd className="inline">{b.email}</dd>
                  </div>
                )}
              </dl>
              {b.notes && <p className="mt-2 whitespace-pre-line rounded-md bg-sunken px-3 py-2 text-sm">{b.notes}</p>}
              {canWrite && (
                <form action={setStatus} className="mt-3 flex items-center justify-end gap-2">
                  <input type="hidden" name="id" value={b.id} />
                  <Select name="status" defaultValue={b.status} aria-label="Status" className="h-9 w-40 text-sm">
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {LABEL[s]}
                      </option>
                    ))}
                  </Select>
                  <Button type="submit" size="sm" variant="outline">
                    Update
                  </Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      {canPublish && services.length > 0 && (
        <section className="mt-12">
          <Eyebrow>Services on the website</Eyebrow>
          <p className="mt-1 text-sm text-muted">Show only the services the shop really offers. Hidden ones cannot be booked.</p>
          <ul className="mt-4 divide-y divide-line rounded-lg border border-line bg-surface">
            {services.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium text-strong">{s.name}</p>
                  <p className="text-sm text-muted">{s.summary}</p>
                </div>
                <form action={setPublished} className="flex items-center gap-3">
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="published" value={s.published ? "false" : "true"} />
                  <Badge tone={s.published ? "positive" : "neutral"}>{s.published ? "Shown" : "Hidden"}</Badge>
                  <Button type="submit" size="sm" variant="outline">
                    {s.published ? "Hide" : "Show"}
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Container>
  );
}

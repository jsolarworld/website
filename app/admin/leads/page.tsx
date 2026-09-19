import { revalidatePath } from "next/cache";
import Link from "next/link";
import { Badge, Button, Container, EmptyState, Select } from "@/components/ui";
import { requireStaff } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { db } from "@/lib/db";
import { telLink, whatsappLink } from "@/lib/site";
import type { LeadStatus } from "@/generated/prisma/client";

export const metadata = { title: "Leads & quotes" };

const STATUSES: LeadStatus[] = ["NEW", "CONTACTED", "INSPECTION_BOOKED", "WON", "LOST"];
const LABEL: Record<LeadStatus, string> = { NEW: "New", CONTACTED: "Contacted", INSPECTION_BOOKED: "Inspection booked", WON: "Won", LOST: "Lost" };
const TONE = { NEW: "solar", CONTACTED: "brand", INSPECTION_BOOKED: "brand", WON: "positive", LOST: "neutral" } as const;

const dateFmt = new Intl.DateTimeFormat("en-NG", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Africa/Lagos" });

async function setStatus(formData: FormData) {
  "use server";
  const staff = await requireStaff("leads:write");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as LeadStatus;
  if (!id || !STATUSES.includes(status)) return;
  const before = await db.lead.findUnique({ where: { id }, select: { status: true } });
  if (!before || before.status === status) return;
  await db.lead.update({ where: { id }, data: { status } });
  await db.auditLog.create({ data: { actorId: staff.id, action: "lead.status", entity: "Lead", entityId: id, before: { status: before.status }, after: { status } } });
  revalidatePath("/admin/leads");
}

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const staff = await requireStaff("leads:read");
  const { status } = await searchParams;
  const filter = STATUSES.includes(status as LeadStatus) ? (status as LeadStatus) : undefined;
  const canWrite = can(staff.role, "leads:write");

  const leads = await db.lead.findMany({
    where: filter ? { status: filter } : {},
    include: { quotes: { orderBy: { createdAt: "desc" }, take: 3, select: { reference: true, engineerReview: true, createdAt: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <Container className="py-8">
      <h1 className="text-display-3">Leads & quotes</h1>
      <nav className="mt-4 flex flex-wrap gap-2" aria-label="Filter by status">
        <Link href="/admin/leads" className={`rounded-full px-3 py-1 text-sm ${!filter ? "bg-chassis text-white" : "bg-sunken text-default"}`}>
          All
        </Link>
        {STATUSES.map((s) => (
          <Link key={s} href={`/admin/leads?status=${s}`} className={`rounded-full px-3 py-1 text-sm ${filter === s ? "bg-chassis text-white" : "bg-sunken text-default"}`}>
            {LABEL[s]}
          </Link>
        ))}
      </nav>

      {leads.length === 0 ? (
        <EmptyState className="mt-6" title="No leads yet" description="When someone saves a quote on the website, they appear here with their phone number." />
      ) : (
        <ul className="mt-6 space-y-3">
          {leads.map((l) => (
            <li key={l.id} className="rounded-lg border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-strong">{l.name ?? "No name given"}</p>
                  <p className="text-sm text-muted numeric">
                    {l.phone} · {dateFmt.format(l.createdAt)}
                    {l.email ? ` · ${l.email}` : ""}
                  </p>
                </div>
                <Badge tone={TONE[l.status]}>{LABEL[l.status]}</Badge>
              </div>

              {l.quotes.length > 0 && (
                <p className="mt-2 text-sm">
                  Quotes:{" "}
                  {l.quotes.map((q) => (
                    <Link key={q.reference} href={`/solar-quote/${q.reference}`} className="mr-3 text-navy-600 underline underline-offset-4" target="_blank">
                      {q.reference}
                      {q.engineerReview ? " (needs engineer)" : ""}
                    </Link>
                  ))}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <a href={telLink(l.phone.replace(/^\+234/, "0"))} className="text-sm text-navy-600 underline underline-offset-4">
                  Call
                </a>
                <a href={whatsappLink("").replace(/wa\.me\/\d+/, `wa.me/${l.phone.replace("+", "")}`)} className="text-sm text-navy-600 underline underline-offset-4" target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>
                {canWrite && (
                  <form action={setStatus} className="ml-auto flex items-center gap-2">
                    <input type="hidden" name="id" value={l.id} />
                    <Select name="status" defaultValue={l.status} aria-label="Status" className="h-9 w-44 text-sm">
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
              </div>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}

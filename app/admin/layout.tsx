import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { Container } from "@/components/ui";
import { getStaffOrNull } from "@/lib/admin/guard";
import { ROLE_LABEL, can, type Permission } from "@/lib/admin/permissions";

// Never indexed (also disallowed in robots.txt).
export const metadata: Metadata = { title: { default: "Admin", template: "%s — Admin" }, robots: { index: false, follow: false } };

const NAV: { href: string; label: string; needs: Permission }[] = [
  { href: "/admin", label: "Dashboard", needs: "catalogue:read" },
  { href: "/admin/products", label: "Products", needs: "catalogue:read" },
  { href: "/admin/leads", label: "Leads & quotes", needs: "leads:read" },
  { href: "/admin/products/prices", label: "Bulk prices", needs: "catalogue:write" },
  { href: "/admin/products/import", label: "CSV import", needs: "catalogue:write" },
  { href: "/admin/staff", label: "Staff", needs: "staff:manage" },
  { href: "/admin/settings", label: "Settings", needs: "settings:write" },
];

/**
 * Chrome only. Layouts do not re-run on client navigation, so authorization is enforced inside
 * every page and action with requireStaff(), never here.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const staff = await getStaffOrNull();
  const links = staff ? NAV.filter((n) => can(staff.role, n.needs)) : [];

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <header className="border-b border-line-on-chassis bg-chassis text-on-chassis edge-solar">
        <Container className="flex h-14 items-center justify-between gap-4">
          <Link href="/admin" className="font-display font-extrabold text-white">
            J <span className="text-solar-400">SOLAR</span> WORLD <span className="ml-1 text-xs font-medium text-on-chassis-muted">Admin</span>
          </Link>
          {staff && (
            <div className="flex items-center gap-3 text-sm">
              <span className="hidden text-on-chassis-muted sm:inline">
                {staff.name} · {ROLE_LABEL[staff.role]}
              </span>
              <Link href="/admin/security" className="text-on-chassis-muted hover:text-white">
                Security
              </Link>
              <SignOutButton />
            </div>
          )}
        </Container>
        {links.length > 0 && (
          <nav aria-label="Admin" className="border-t border-line-on-chassis">
            <Container className="flex gap-1 overflow-x-auto py-1">
              {links.map((n) => (
                <Link key={n.href} href={n.href} className="shrink-0 rounded-md px-3 py-2 text-sm font-medium text-on-chassis hover:bg-white/10 hover:text-white">
                  {n.label}
                </Link>
              ))}
            </Container>
          </nav>
        )}
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

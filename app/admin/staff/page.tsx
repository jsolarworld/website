import { StaffManager, type StaffRow } from "@/components/admin/staff-manager";
import { Container } from "@/components/ui";
import { requireStaff } from "@/lib/admin/guard";
import { STAFF_ROLES, type StaffRole } from "@/lib/admin/permissions";
import { db } from "@/lib/db";

export const metadata = { title: "Staff" };

export default async function StaffPage() {
  const me = await requireStaff("staff:manage");
  const users = await db.user.findMany({
    where: { role: { in: [...STAFF_ROLES] } },
    orderBy: [{ createdAt: "asc" }],
    select: { id: true, name: true, email: true, role: true, twoFactorEnabled: true, requireTwoFactor: true, createdAt: true },
  });

  const staff: StaffRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as StaffRole,
    twoFactorEnabled: u.twoFactorEnabled,
    requireTwoFactor: u.requireTwoFactor,
    isSelf: u.id === me.id,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <Container className="max-w-3xl py-8">
      <h1 className="text-display-3">Staff</h1>
      <p className="mt-2 text-muted">
        Add people who need the admin, choose what they can do, and take access away when someone leaves. Sign-in uses a password, plus an authenticator app for anyone you require it for (on by default).
      </p>
      <div className="mt-8">
        <StaffManager staff={staff} />
      </div>
    </Container>
  );
}

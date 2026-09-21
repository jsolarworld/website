import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "../auth";
import { needsTwoFactorSetup } from "./staff-rules";
import { can, isStaffRole, type Permission, type StaffRole } from "./permissions";

export interface Staff {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  twoFactorEnabled: boolean;
  /** Owners can switch this off per person on the Staff page. */
  requireTwoFactor: boolean;
}

const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

/** Set ADMIN_2FA_OPTIONAL=1 only on a local machine to skip the authenticator requirement. */
const twoFactorOptional = process.env.ADMIN_2FA_OPTIONAL === "1" && process.env.NODE_ENV !== "production";

type SessionUser = { id: string; name: string; email: string; role?: string; twoFactorEnabled?: boolean | null; requireTwoFactor?: boolean | null };

async function currentStaff(): Promise<Staff | "not-staff" | null> {
  const session = await getSession();
  if (!session) return null;
  const u = session.user as SessionUser;
  if (!isStaffRole(u.role)) return "not-staff";
  return { id: u.id, name: u.name, email: u.email, role: u.role, twoFactorEnabled: u.twoFactorEnabled === true, requireTwoFactor: u.requireTwoFactor !== false };
}

/**
 * The single gate for the admin. Call it at the top of EVERY admin page, server action and route
 * handler: layouts do not re-run on client navigation, and server actions are publicly POSTable.
 * Redirects to sign in when there is no staff session, to security setup when 2FA is required but not set up, and to
 * the dashboard when the role lacks the permission.
 */
export async function requireStaff(
  permission?: Permission,
  opts: { allowWithout2fa?: boolean } = {},
): Promise<Staff> {
  const staff = await currentStaff();
  if (staff === null) redirect("/admin/login");
  if (staff === "not-staff") redirect("/admin/login?error=not-staff");

  if (needsTwoFactorSetup(staff) && !twoFactorOptional && !opts.allowWithout2fa) redirect("/admin/security");
  if (permission && !can(staff.role, permission)) redirect("/admin?denied=1");
  return staff;
}

/** For chrome that only needs to know whether a staff member is signed in, without redirecting. */
export async function getStaffOrNull(): Promise<Staff | null> {
  const staff = await currentStaff();
  return staff === null || staff === "not-staff" ? null : staff;
}

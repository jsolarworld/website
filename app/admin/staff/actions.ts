"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/admin/audit";
import { requireStaff } from "@/lib/admin/guard";
import { STAFF_ROLES, isStaffRole } from "@/lib/admin/permissions";
import { createStaffUser, resetStaffSignIn, setStaffAccess } from "@/lib/admin/staff";
import { makeTemporaryPassword, refuseAccessChange } from "@/lib/admin/staff-rules";
import { db } from "@/lib/db";

export interface StaffState {
  error?: string;
  message?: string;
  /** A temporary password, shown to the owner exactly once. */
  reveal?: { email: string; password: string };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createStaff(_prev: StaffState, formData: FormData): Promise<StaffState> {
  const actor = await requireStaff("staff:manage");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const role = formData.get("role");

  if (!EMAIL.test(email) || email.length > 120) return { error: "Enter a valid email address." };
  if (name.length < 2 || name.length > 80) return { error: "Enter the person's name." };
  if (!isStaffRole(role)) return { error: "Choose a role." };

  const password = makeTemporaryPassword(randomInt);
  try {
    const user = await createStaffUser({ email, name, role, password });
    await logAudit({ actorId: actor.id, action: "staff.create", entity: "User", entityId: user.id, after: { email, role } });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not create the account." };
  }
  revalidatePath("/admin/staff");
  return { message: `Account created for ${email}.`, reveal: { email, password } };
}

/** Row actions on one existing staff member: change role, reset sign-in, or remove access. */
export async function manageStaff(_prev: StaffState, formData: FormData): Promise<StaffState> {
  const actor = await requireStaff("staff:manage");
  const intent = String(formData.get("intent") ?? "");
  const id = String(formData.get("id") ?? "");

  const target = await db.user.findUnique({ where: { id }, select: { id: true, email: true, name: true, role: true } });
  if (!target || !isStaffRole(target.role)) return { error: "That staff member no longer exists." };

  const ownerCount = await db.user.count({ where: { role: "OWNER" } });
  const check = (newRole: (typeof STAFF_ROLES)[number] | "REMOVED") =>
    refuseAccessChange({ actorId: actor.id, targetId: target.id, targetRole: target.role as (typeof STAFF_ROLES)[number], newRole, ownerCount });

  if (intent === "role") {
    const role = formData.get("role");
    if (!isStaffRole(role)) return { error: "Choose a role." };
    const refused = check(role);
    if (refused) return { error: refused };
    if (role === target.role) return { message: "No change." };
    await setStaffAccess(target.id, role);
    await logAudit({ actorId: actor.id, action: "staff.role", entity: "User", entityId: target.id, before: { role: target.role }, after: { role } });
    revalidatePath("/admin/staff");
    return { message: `${target.name} is now ${role.toLowerCase().replace("_", " ")}. They have been signed out.` };
  }

  if (intent === "remove") {
    const refused = check("REMOVED");
    if (refused) return { error: refused };
    await setStaffAccess(target.id, "REMOVED");
    await logAudit({ actorId: actor.id, action: "staff.remove", entity: "User", entityId: target.id, before: { role: target.role }, after: { role: "CUSTOMER" } });
    revalidatePath("/admin/staff");
    return { message: `${target.name} no longer has admin access.` };
  }

  if (intent === "reset") {
    // Resetting yourself would lock you out mid-session; use Security to change your own password.
    if (target.id === actor.id) return { error: "Use the Security page to change your own password." };
    const password = makeTemporaryPassword(randomInt);
    await resetStaffSignIn(target.id, password);
    await logAudit({ actorId: actor.id, action: "staff.reset", entity: "User", entityId: target.id });
    revalidatePath("/admin/staff");
    return { message: `Sign-in reset for ${target.name}. They must set up their authenticator again.`, reveal: { email: target.email, password } };
  }

  return { error: "Unknown action." };
}

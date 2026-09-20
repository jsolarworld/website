import "server-only";
import { auth } from "../auth";
import { db } from "../db";
import type { StaffRole } from "./permissions";

/**
 * Create a staff login without going through public sign-up (which is disabled).
 * The user must then sign in and enrol an authenticator app before reaching the admin.
 */
export async function createStaffUser(input: { email: string; name: string; role: StaffRole; password: string }) {
  const ctx = await auth.$context;
  const email = input.email.trim().toLowerCase();

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) throw new Error("A user with that email already exists");
  if (input.password.length < ctx.password.config.minPasswordLength) {
    throw new Error(`Password must be at least ${ctx.password.config.minPasswordLength} characters`);
  }

  // Written with Prisma directly: sign-up is disabled, and this is a trusted server-side path.
  const id = ctx.generateId({ model: "user" }) || crypto.randomUUID();
  const passwordHash = await ctx.password.hash(input.password);
  const user = await db.user.create({
    data: {
      id,
      email,
      name: input.name.trim(),
      emailVerified: true,
      role: input.role,
      accounts: {
        create: { id: crypto.randomUUID(), providerId: "credential", accountId: id, password: passwordHash },
      },
    },
  });
  return user;
}

/** Replace a staff member's password with a new temporary one, clear their authenticator, and sign them out everywhere. */
export async function resetStaffSignIn(userId: string, temporaryPassword: string) {
  const ctx = await auth.$context;
  const hash = await ctx.password.hash(temporaryPassword);
  await db.$transaction([
    db.account.updateMany({ where: { userId, providerId: "credential" }, data: { password: hash } }),
    db.twoFactor.deleteMany({ where: { userId } }),
    db.user.update({ where: { id: userId }, data: { twoFactorEnabled: false } }),
    db.session.deleteMany({ where: { userId } }),
  ]);
}

/** Change a role, or take admin access away entirely (role becomes CUSTOMER). Always signs the person out. */
export async function setStaffAccess(userId: string, role: StaffRole | "REMOVED") {
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { role: role === "REMOVED" ? "CUSTOMER" : role } }),
    db.session.deleteMany({ where: { userId } }),
  ]);
}

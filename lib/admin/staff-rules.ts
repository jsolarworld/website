import type { StaffRole } from "./permissions";

/**
 * Guard rails for changing a staff member's access, kept pure so they can be tested.
 * Returns an error message when the change must be refused, or null when it is allowed.
 */
export function refuseAccessChange(input: {
  actorId: string;
  targetId: string;
  targetRole: StaffRole;
  /** The role after the change, or "REMOVED" when access is being taken away. */
  newRole: StaffRole | "REMOVED";
  ownerCount: number;
}): string | null {
  const { actorId, targetId, targetRole, newRole, ownerCount } = input;
  if (actorId === targetId) return "You cannot change your own access. Ask another owner.";
  if (targetRole === "OWNER" && newRole !== "OWNER" && ownerCount <= 1) return "There must always be at least one owner.";
  return null;
}

/** Whether this person must be sent to set up an authenticator app before they can use the admin. */
export function needsTwoFactorSetup(u: { requireTwoFactor: boolean; twoFactorEnabled: boolean }): boolean {
  return u.requireTwoFactor && !u.twoFactorEnabled;
}

/** A readable temporary password: 12 characters, no look-alikes (0/O, 1/l/I). */
export function makeTemporaryPassword(random: (max: number) => number): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 12 }, () => alphabet[random(alphabet.length)]).join("");
}

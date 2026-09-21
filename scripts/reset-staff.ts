import "dotenv/config";
import { randomBytes } from "node:crypto";
import { isStaffRole } from "../lib/admin/permissions";
import { resetStaffSignIn } from "../lib/admin/staff";
import { db } from "../lib/db";

// Emergency recovery when nobody can sign in (e.g. both owners locked out and no email is set up).
// Usage: pnpm admin:reset <email>
// Sets a new random temporary password, removes the authenticator (they enrol a new one at /admin/security),
// and signs the person out everywhere. Run from a machine that has the production DATABASE_URL in .env.
const [emailArg] = process.argv.slice(2);

async function main() {
  if (!emailArg) {
    console.error("Usage: pnpm admin:reset <email>");
    process.exit(1);
  }
  const user = await db.user.findUnique({ where: { email: emailArg.trim().toLowerCase() } });
  if (!user || !isStaffRole(user.role)) {
    console.error("No staff account with that email.");
    process.exit(1);
  }
  const password = randomBytes(9).toString("base64url");
  await resetStaffSignIn(user.id, password);
  console.log(`Reset sign-in for ${user.email} (${user.role}).`);
  console.log(`Temporary password (shown once): ${password}`);
  console.log("Sign in at /admin/login, then set up the authenticator app and change the password at /admin/security.");
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

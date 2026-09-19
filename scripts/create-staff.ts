import "dotenv/config";
import { randomBytes } from "node:crypto";
import { createStaffUser } from "../lib/admin/staff";
import { STAFF_ROLES, isStaffRole } from "../lib/admin/permissions";
import { db } from "../lib/db";

// Usage: pnpm admin:create <email> "<Full name>" <OWNER|STORE_MANAGER|SALES_REP|CONTENT_EDITOR> [password]
// Without a password, a random one is generated and printed once.
const [email, name, role, given] = process.argv.slice(2);

async function main() {
  if (!email || !name || !isStaffRole(role)) {
    console.error(`Usage: pnpm admin:create <email> "<Full name>" <${STAFF_ROLES.join("|")}> [password]`);
    process.exit(1);
  }
  const password = given ?? randomBytes(9).toString("base64url");
  await createStaffUser({ email, name, role, password });
  console.log(`Created ${role} ${email}`);
  if (!given) console.log(`Temporary password (shown once): ${password}`);
  console.log("Sign in at /admin/login, then set up your authenticator app when asked.");
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

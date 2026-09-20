import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins";
import { db } from "./db";
import { SITE } from "./site";

/**
 * Staff sign in with email + password + an authenticator code. Public sign-up is off:
 * staff are created by the owner (see lib/admin/staff.ts). Customer accounts are a later phase.
 */
export const auth = betterAuth({
  appName: SITE.shortName,
  baseURL: process.env.BETTER_AUTH_URL ?? SITE.url,
  // Next picks the next free port when 3000 is busy (3001, 3002...), and Better Auth rejects any origin
  // it does not trust. Any localhost port is trusted in development only; production trusts baseURL alone.
  trustedOrigins: process.env.NODE_ENV === "production" ? [] : ["http://localhost:*"],
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 10,
  },
  user: {
    additionalFields: {
      // input: false means a client can never set its own role.
      role: { type: "string", required: false, defaultValue: "CUSTOMER", input: false },
      phone: { type: "string", required: false },
    },
  },
  plugins: [twoFactor({ issuer: SITE.shortName }), nextCookies()],
});

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins";
import { db } from "./db";
import { SITE } from "./site";

// Vercel sets VERCEL_PROJECT_PRODUCTION_URL to the production domain automatically (the custom domain
// once one is attached), so sign-in keeps working across a domain change even if BETTER_AUTH_URL is unset.
const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const baseURL = process.env.BETTER_AUTH_URL ?? (productionHost ? `https://${productionHost}` : SITE.url);

// Better Auth rejects any request origin it does not trust (CSRF protection). Development trusts any
// localhost port because Next moves to 3001, 3002... when 3000 is busy. Production trusts the base URL, the
// production domain, and anything listed in AUTH_TRUSTED_ORIGINS (comma-separated), e.g. the old
// *.vercel.app address while a new domain is being switched over.
const trustedOrigins =
  process.env.NODE_ENV === "production"
    ? [baseURL, ...(productionHost ? [`https://${productionHost}`] : []), ...(process.env.AUTH_TRUSTED_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? [])]
    : ["http://localhost:*"];

/**
 * Staff sign in with email + password + an authenticator code. Public sign-up is off:
 * staff are created by the owner (see lib/admin/staff.ts). Customer accounts are a later phase.
 */
export const auth = betterAuth({
  appName: SITE.shortName,
  baseURL,
  trustedOrigins,
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

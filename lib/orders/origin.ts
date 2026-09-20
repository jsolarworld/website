import "server-only";
import { headers } from "next/headers";
import { SITE } from "../site";

/** The origin the visitor is actually on (works on localhost, the vercel.app address and a custom domain alike). */
export async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return SITE.url;
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

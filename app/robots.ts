import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/cart", "/checkout", "/account", "/design", "/api"] },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}

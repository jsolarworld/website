import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/** Gives Android the company icon when someone adds the site to their home screen. Not an installable app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: SITE.shortName,
    start_url: "/",
    display: "browser",
    // The pale blue behind the logo, as in the icons themselves and the site header.
    background_color: "#bfd7fe",
    theme_color: "#bfd7fe",
    icons: [
      { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}

"use client";

import { usePathname } from "next/navigation";
import { SITE } from "@/lib/site";

/** Floating on every page; the message names the page the visitor is on (PRD GLB-02). */
export function WhatsAppButton() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  const text = `Hello ${SITE.shortName}, I need help on this page: ${SITE.url}${pathname}`;
  return (
    <a
      href={`https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-50 inline-flex h-12 items-center gap-2 rounded-full bg-grid-600 px-5 font-display text-sm font-semibold text-white shadow-md transition-colors hover:bg-grid-700"
    >
      WhatsApp
    </a>
  );
}

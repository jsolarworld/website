"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Public header, footer and WhatsApp button around every page except the admin,
 * which brings its own chrome. The pieces are server-rendered and passed in as props.
 */
export function SiteChrome({
  header,
  footer,
  floating,
  children,
}: {
  header: ReactNode;
  footer: ReactNode;
  floating: ReactNode;
  children: ReactNode;
}) {
  const inAdmin = usePathname().startsWith("/admin");
  return (
    <>
      {!inAdmin && header}
      <div className="flex flex-1 flex-col">{children}</div>
      {!inAdmin && footer}
      {!inAdmin && floating}
    </>
  );
}

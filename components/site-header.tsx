import Image from "next/image";
import Link from "next/link";
import { CartLink } from "@/components/cart-link";
import { Container, buttonClass } from "@/components/ui";
import { SITE, telLink } from "@/lib/site";

const NAV = [
  { href: "/products", label: "Products" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line-on-masthead bg-masthead text-on-masthead">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center" aria-label={`${SITE.name} home`}>
          {/* The logo carries the company name in navy, on the bar's own pale blue: no tile, no text beside it. */}
          <Image src="/j-solar-world-logo-transparent.png" alt="" width={99} height={48} loading="eager" className="h-12 w-auto" />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-md px-3 py-2 text-sm font-medium text-on-masthead hover:bg-white/50">
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <CartLink />
          <a href={telLink(SITE.phones[0])} className="hidden text-sm text-on-masthead-muted hover:text-on-masthead lg:block">
            {SITE.phones[0]}
          </a>
          <Link href="/solar-quote" className={buttonClass({ variant: "outline", size: "sm" })}>
            Get a Quote
          </Link>
        </div>
      </Container>

      {/* Mobile nav: plain links, no JavaScript. */}
      <nav aria-label="Main mobile" className="border-t border-line-on-masthead md:hidden">
        <Container className="flex gap-1 overflow-x-auto py-1">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="shrink-0 rounded-md px-3 py-2 text-sm font-medium text-on-masthead hover:bg-white/50">
              {n.label}
            </Link>
          ))}
        </Container>
      </nav>
    </header>
  );
}

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
    <header className="sticky top-0 z-40 border-b border-line-on-chassis bg-chassis text-on-chassis edge-solar">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3" aria-label={`${SITE.name} home`}>
          {/* The logo has dark blue lettering, so it sits on a white tile against the navy bar. */}
          <span className="rounded-md bg-white p-0.5">
            <Image src="/logo.webp" alt="" width={44} height={44} priority className="size-11 object-contain" />
          </span>
          <span className="hidden font-display text-lg font-extrabold tracking-tight text-white sm:block">
            J <span className="text-solar-400">SOLAR</span> WORLD
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-on-chassis hover:bg-white/10 hover:text-white"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <CartLink />
          <a href={telLink(SITE.phones[0])} className="hidden text-sm text-on-chassis-muted hover:text-white lg:block">
            {SITE.phones[0]}
          </a>
          <Link href="/solar-quote" className={buttonClass({
              variant: "outline",
              size: "sm",
              className: "border-line-on-chassis bg-transparent text-white hover:border-white/40 hover:bg-white/10 hover:text-white",
            })}>
            Get a Quote
          </Link>
        </div>
      </Container>

      {/* Mobile nav: plain links, no JavaScript. */}
      <nav aria-label="Main mobile" className="border-t border-line-on-chassis md:hidden">
        <Container className="flex gap-1 overflow-x-auto py-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="shrink-0 rounded-md px-3 py-2 text-sm font-medium text-on-chassis hover:bg-white/10"
            >
              {n.label}
            </Link>
          ))}
        </Container>
      </nav>
    </header>
  );
}

import Link from "next/link";
import { Container, Eyebrow, Rule } from "@/components/ui";
import { SITE, telLink, whatsappLink } from "@/lib/site";

const LINKS = [
  { href: "/products", label: "Products" },
  { href: "/solar-quote", label: "Get a Quote" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
];
const LEGAL = [
  { href: "/delivery", label: "Delivery" },
  { href: "/returns-and-warranty", label: "Returns & warranty" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
];

export function SiteFooter() {
  return (
    <footer className="bg-chassis text-on-chassis">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-lg font-extrabold text-white">
            J <span className="text-solar-400">SOLAR</span> WORLD
          </p>
          <Rule className="mt-3" />
          <p className="mt-4 text-sm text-on-chassis-muted">{SITE.slogan}</p>
        </div>

        <div>
          <Eyebrow className="text-solar-400">Visit the shop</Eyebrow>
          <address className="mt-3 text-sm not-italic leading-relaxed">{SITE.address}</address>
          <p className="mt-2 text-sm text-on-chassis-muted">{SITE.hours}</p>
        </div>

        <div>
          <Eyebrow className="text-solar-400">Contact</Eyebrow>
          <ul className="mt-3 space-y-1.5 text-sm">
            {SITE.phones.map((p) => (
              <li key={p}>
                <a href={telLink(p)} className="hover:text-white">
                  {p}
                </a>
              </li>
            ))}
            <li>
              <a href={whatsappLink("Hello J Solar World")} className="hover:text-white">
                WhatsApp
              </a>
            </li>
            <li>
              <a href={`mailto:${SITE.email}`} className="hover:text-white">
                {SITE.email}
              </a>
            </li>
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-6 sm:col-span-2 lg:col-span-1 lg:grid-cols-1">
          <ul className="space-y-1.5 text-sm">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <ul className="space-y-1.5 text-sm text-on-chassis-muted">
            {LEGAL.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
      <div className="border-t border-line-on-chassis">
        <Container className="py-5 text-xs text-on-chassis-muted">
          © {new Date().getFullYear()} {SITE.name}. CAC registered (RC 9403389).
        </Container>
      </div>
    </footer>
  );
}

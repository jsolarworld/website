import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Archivo, Inter } from "next/font/google";
import { SITE } from "@/lib/site";
import { SiteChrome } from "@/components/site-chrome";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WhatsAppButton } from "@/components/whatsapp-button";
import "./globals.css";

// Display face: headings, prices, buttons. See docs/DESIGN.md.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

// Text face: body copy, spec tables, form fields.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.slogan}`,
    template: `%s — ${SITE.shortName}`,
  },
  description:
    "Inverters, lithium and tubular batteries, solar panels, street lights and complete solar systems, " +
    `sold and installed from ${SITE.address}. Nationwide delivery.`,
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: "en_NG",
    url: SITE.url,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-NG"
      className={`${archivo.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteChrome
          header={<SiteHeader />}
          footer={<SiteFooter />}
          floating={
            <>
              <WhatsAppButton />
              {/* Visitor and speed metrics for the public site only; SiteChrome drops all of this under /admin. */}
              <Analytics />
              <SpeedInsights />
            </>
          }
        >
          {children}
        </SiteChrome>
      </body>
    </html>
  );
}

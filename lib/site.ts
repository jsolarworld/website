export const SITE = {
  name: "J Solar World Energy",
  shortName: "J Solar World",
  slogan: "Reliable & Trusted Solar Energy Solutions",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://j-solar-world.vercel.app",
  phones: ["09044871185", "08100362453"],
  whatsapp: "2349044871185",
  email: "Jsolarworld2@gmail.com",
  address: "F-Line 1424, Ojo Alaba International Market, Lagos State",
  hours: "Mon–Sat, 24 hours. Closed Sunday.",
} as const;

export function whatsappLink(text: string) {
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`;
}

export function telLink(phone: string) {
  return `tel:+234${phone.replace(/^0/, "")}`;
}

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
export const formatNaira = (n: number) => naira.format(n);

/** Escape "<" so JSON-LD can't close the script tag. */
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, "\u003c");

/** Google Maps search for the market: the shop's own pin and a landmark are still to come from the owner. */
export const MAP_QUERY = "Alaba International Market, Ojo, Lagos";
export const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(MAP_QUERY)}`;

/** LocalBusiness structured data, shared by the home and About pages. */
export const localBusiness = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: SITE.name,
  url: SITE.url,
  telephone: `+234${SITE.phones[0].slice(1)}`,
  email: SITE.email,
  slogan: SITE.slogan,
  address: {
    "@type": "PostalAddress",
    streetAddress: "F-Line 1424, Ojo Alaba International Market",
    addressLocality: "Ojo",
    addressRegion: "Lagos",
    addressCountry: "NG",
  },
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    opens: "00:00",
    closes: "23:59",
  },
};

export const SITE = {
  name: "J Solar World Energy",
  shortName: "J Solar World",
  slogan: "Reliable & Trusted Solar Energy Solutions",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://j-solar-world.vercel.app",
  phones: ["08100362453", "09044871185"],
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

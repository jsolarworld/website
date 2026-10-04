import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import type { ApplianceCategory } from "../generated/prisma/client";
import { APPLIANCES } from "../lib/quote/appliances";
import { DEFAULT_SETTINGS } from "../lib/quote/defaults";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type Spec = { key: string; label: string; unit?: string; filterable?: boolean };

const num = (key: string, label: string, unit: string, filterable = true): Spec => ({ key, label, unit, filterable });
const text = (key: string, label: string, filterable = false): Spec => ({ key, label, filterable });

// Spec fields per category. `ratedContinuousW` on inverters is what the quote engine checks, not the kVA in the name.
const CATEGORIES: { slug: string; name: string; specTemplate: Spec[] }[] = [
  {
    slug: "inverters",
    name: "Inverters",
    specTemplate: [
      num("ratedKva", "Rating", "kVA"),
      num("ratedContinuousW", "Rated continuous power", "W"),
      num("surgeW", "Surge power", "W", false),
      num("systemVoltage", "System voltage", "V"),
      text("type", "Type", true),
    ],
  },
  {
    // An inverter sold with its battery: one stacked all-in-one unit or a matched set. The quote tool needs both halves' ratings.
    slug: "inverter-and-battery-sets",
    name: "Inverter and Battery Sets",
    specTemplate: [
      num("ratedKva", "Inverter rating", "kVA"),
      num("ratedContinuousW", "Rated continuous power", "W"),
      num("surgeW", "Surge power", "W", false),
      num("batteryKwh", "Battery capacity", "kWh"),
      num("systemVoltage", "Battery voltage", "V"),
      text("type", "Type", true),
    ],
  },
  {
    slug: "lithium-batteries",
    name: "Lithium Batteries",
    specTemplate: [
      num("capacityKwh", "Capacity", "kWh"),
      num("voltage", "Voltage", "V"),
      num("capacityAh", "Capacity", "Ah", false),
      text("cells", "Cell type"),
    ],
  },
  {
    slug: "tubular-batteries",
    name: "Tubular Batteries",
    specTemplate: [num("capacityAh", "Capacity", "Ah"), num("voltage", "Voltage", "V")],
  },
  {
    slug: "drycell-batteries",
    name: "Drycell Batteries",
    specTemplate: [num("capacityAh", "Capacity", "Ah"), num("voltage", "Voltage", "V"), text("type", "Type", true)],
  },
  {
    slug: "solar-water-heaters",
    name: "Solar Water Heaters",
    specTemplate: [num("capacityLitres", "Tank capacity", "L"), num("tubes", "Number of tubes", "tubes", false), text("type", "Type", true)],
  },
  {
    slug: "inverter-air-conditioners",
    name: "Inverter Air Conditioners",
    specTemplate: [num("capacityHp", "Capacity", "HP"), num("coolingBtu", "Cooling", "BTU", false), text("type", "Type", true)],
  },
  {
    slug: "solar-freezers",
    name: "Solar Freezers",
    specTemplate: [num("capacityLitres", "Capacity", "L"), text("power", "Power supply", true)],
  },
  {
    slug: "solar-panels",
    name: "Solar Panels",
    specTemplate: [num("watts", "Power", "W"), text("type", "Cell type", true), num("voltageVmp", "Vmp", "V", false)],
  },
  {
    slug: "solar-street-lights",
    name: "Solar Street Lights",
    specTemplate: [num("watts", "Power", "W"), text("type", "Type", true)],
  },
  { slug: "solar-packages", name: "Solar Packages", specTemplate: [] },
  { slug: "accessories", name: "Accessories and Protection", specTemplate: [text("type", "Type", true)] },
  { slug: "cables-and-components", name: "Cables and System Components", specTemplate: [text("type", "Type", true)] },
];

// Brands the owner says he carries (inverters and lithium batteries), spelled as printed on the products.
// Brands that arrive with products (panels, street lights) are created by the product form or the chat import.
const BRANDS = [
  "Felicity", "Deye", "Sako", "Africell", "SMS", "LVTOPSUN", "Yohako",
  "Blue Power", "Blue Carbon", "Ecolion", "Cworth",
];

// Services (PRD SRV-02). The owner has confirmed installation of complete systems; the site inspection is where the
// quote tool sends big or unusual jobs. The last two are the PRD's proposals and stay hidden until the owner confirms
// them (switch on at /admin/bookings). No "from" prices: none have been given.
const SERVICES: { slug: string; name: string; summary: string; body: string; published: boolean }[] = [
  {
    slug: "solar-installation",
    name: "Solar system installation",
    summary: "We install the complete solar systems we sell, for homes, shops and offices.",
    body:
      "We install complete systems bought from us: the inverter, the batteries, the solar panels and the wiring between them.\n\n" +
      "Before any work starts, we agree the design and the installation price with you. Transport to your site is billed separately where it applies.",
    published: true,
  },
  {
    slug: "site-inspection",
    name: "Site inspection",
    summary: "An engineer visits, looks at your building and appliances, and recommends the right system.",
    body:
      "Book a site inspection when your load is too big or unusual for an instant quote, or when you want an engineer to see the building before you buy.\n\n" +
      "The engineer checks where the panels, inverter and batteries can go and what you want to power, then recommends a system and gives you a price. Any visit or transport fee is agreed with you before the visit.",
    published: true,
  },
  {
    slug: "maintenance-and-repairs",
    name: "Maintenance and repairs",
    summary: "Checks, cleaning and fault finding on solar and inverter systems.",
    body: "We check connections, batteries and panels, clean the panels, and find and fix faults on solar and inverter systems.",
    published: false,
  },
  {
    slug: "battery-and-inverter-replacement",
    name: "Battery and inverter replacement",
    summary: "Replace an old battery bank or inverter, or upgrade your system to carry more.",
    body: "We replace worn-out batteries and inverters, and upgrade systems that no longer carry what you need to power.",
    published: false,
  },
];

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

async function main() {
  for (const [i, c] of CATEGORIES.entries()) {
    await db.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, specTemplate: c.specTemplate, sortOrder: i },
      create: { slug: c.slug, name: c.name, specTemplate: c.specTemplate, sortOrder: i },
    });
  }

  for (const name of BRANDS) {
    await db.brand.upsert({ where: { slug: slugify(name) }, update: { name }, create: { slug: slugify(name), name } });
  }

  // Appliance library: starter values (PRD 7.5). Re-running resets them, so skip once staff have edited the library.
  for (const [i, a] of APPLIANCES.entries()) {
    const data = {
      name: a.name,
      category: a.category.toUpperCase() as ApplianceCategory,
      watts: a.watts,
      dutyCycle: a.dutyCycle,
      surge: a.surge,
      highDraw: a.highDraw,
      sortOrder: i,
    };
    await db.appliance.upsert({ where: { slug: a.id }, update: data, create: { slug: a.id, ...data } });
  }

  // Services: create only, so whether each one is shown (switched in admin) is never reset by a re-seed.
  for (const [i, s] of SERVICES.entries()) {
    await db.service.upsert({ where: { slug: s.slug }, update: {}, create: { ...s, sortOrder: i } });
  }

  // Settings: create only if missing, so admin edits are never overwritten by a re-seed.
  await db.setting.upsert({
    where: { key: "quote.settings" },
    update: {},
    create: { key: "quote.settings", value: DEFAULT_SETTINGS as object },
  });

  console.log(
    `Seeded ${CATEGORIES.length} categories, ${BRANDS.length} brands, ${APPLIANCES.length} appliances, ${SERVICES.length} services, quote settings.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

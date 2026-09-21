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

// Brands the owner says he carries (inverters and lithium batteries). Panel brands are still open.
const BRANDS = [
  "Felicity", "Deye", "Sako", "Africell", "SMS", "LVSTUPSUN", "Yohako",
  "Blue Power", "Blue Carbon", "Ecolione", "Cworth",
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

  // Settings: create only if missing, so admin edits are never overwritten by a re-seed.
  await db.setting.upsert({
    where: { key: "quote.settings" },
    update: {},
    create: { key: "quote.settings", value: DEFAULT_SETTINGS as object },
  });

  console.log(
    `Seeded ${CATEGORIES.length} categories, ${BRANDS.length} brands, ${APPLIANCES.length} appliances, quote settings.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

import type { Metadata } from "next";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  Container,
  EmptyState,
  Eyebrow,
  Field,
  Input,
  Notice,
  Panel,
  Price,
  Rule,
  Section,
  SectionHeader,
  Select,
  Skeleton,
  SpecFigure,
  SpecList,
  SpecStrip,
  Textarea,
  buttonClass,
} from "@/components/ui";
import { ProductCard } from "@/components/product-card";
import { BrandSystems } from "@/components/quote/brand-systems";
import type { ProductCardData } from "@/lib/catalogue";
import { APPLIANCES, itemFromAppliance } from "@/lib/quote/appliances";
import { DEFAULT_SETTINGS } from "@/lib/quote/defaults";
import { computeNeeds } from "@/lib/quote/engine";
import { buildSystems } from "@/lib/quote/systems";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};

/* Stand-ins for catalogue rows, so the tile's states can be seen without touching the database. */
const sampleProduct = (o: { name: string; brand: string; priceNgn: number | null; salePriceNgn?: number; stock?: number; onRequest?: boolean }): ProductCardData => ({
  id: `sample-${o.name}`,
  kind: "PRODUCT",
  slug: "sample",
  sku: null,
  name: o.name,
  description: null,
  categoryId: "sample",
  brandId: "sample",
  priceNgn: o.priceNgn,
  salePriceNgn: o.salePriceNgn ?? null,
  stock: o.stock ?? 0,
  lowStockThreshold: 2,
  availableOnRequest: o.onRequest ?? false,
  specs: {},
  warranty: null,
  datasheetUrl: null,
  weightKg: null,
  status: "PUBLISHED",
  featured: false,
  seoTitle: null,
  seoDescription: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  brand: { id: "sample", slug: "sample", name: o.brand },
  category: { id: "sample", slug: "sample", name: "Lithium Batteries", intro: null, specTemplate: [], sortOrder: 0 },
  media: [],
});

const sampleProducts = [
  sampleProduct({ name: "Felicity FLA 5kWh Lithium Battery 48V", brand: "Felicity", priceNgn: 1_050_000, stock: 4 }),
  sampleProduct({ name: "Cworth 12V 100Ah Lithium Battery", brand: "Cworth", priceNgn: 240_000, salePriceNgn: 215_000, onRequest: true }),
  sampleProduct({ name: "LVTOPSUN 32kWh Lithium Battery 51.2V", brand: "LVTOPSUN", priceNgn: null, onRequest: true }),
  sampleProduct({ name: "Sako 5kVA Inverter 48V", brand: "Sako", priceNgn: 480_000 }),
];

/* Class names are written out in full: Tailwind scans source text, so a
   template-literal class like `bg-${x}` would never be generated. */
// Made-up ratings and prices, run through the real builder for a small home, so the sample shows what a customer would see.
const samplePart = (name: string, price: number) => ({ id: name, name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), price, stock: null });
const sampleNeeds = computeNeeds(
  {
    backupHours: 12,
    items: [
      ["led-bulb", 8, 6],
      ["ceiling-fan", 3, 8],
      ["tv-43", 1, 5],
      ["refrigerator", 1, 24],
      ["large-freezer", 1, 24],
      ["washing-machine", 1, 1],
      ["water-pump-1hp", 1, 1],
    ].map(([id, qty, hours]) => itemFromAppliance(APPLIANCES.find((a) => a.id === id)!, qty as number, hours as number)),
  },
  DEFAULT_SETTINGS,
);
const sampleSystems = buildSystems(
  sampleNeeds,
  {
    inverters: [
      { ...samplePart("Felicity 6kVA Hybrid Inverter 48V", 950_000), brand: "Felicity", continuousW: 6000, surgeW: 12000, systemVoltage: 48 },
      { ...samplePart("Deye 6kW Hybrid Inverter", 1_400_000), brand: "Deye", continuousW: 6000, surgeW: 12000, systemVoltage: 48 },
    ],
    batteries: [
      { ...samplePart("Felicity 5kWh Lithium Battery 48V", 1_050_000), brand: "Felicity", chemistry: "lithium", wh: 5120, voltage: 51.2 },
      { ...samplePart("Felicity 10kWh Lithium Battery 51.2V", 1_900_000), brand: "Felicity", chemistry: "lithium", wh: 10_240, voltage: 51.2 },
      { ...samplePart("Deye 5kWh Lithium Battery", 950_000), brand: "Deye", chemistry: "lithium", wh: 5120, voltage: 51.2 },
    ],
    sets: [{ ...samplePart("Felicity All-in-One 8kVA Inverter with 10kWh Lithium Battery", 2_500_000), brand: "Felicity", continuousW: 8000, surgeW: 16000, batteryWh: 10_000 }],
    panels: [{ ...samplePart("Jinko 650W Mono Solar Panel", 135_000), watts: 650 }],
  },
  DEFAULT_SETTINGS,
).map((o, i) => ({ ...o, overBudget: i === 2 }));

const ramps = [
  {
    name: "navy",
    role: "Chassis. Navigation, panels, structure, links.",
    from: "#032f7f + #0153b7 — the wordmark and the panel in the logo",
    stops: [
      { k: "50", cls: "bg-navy-50", hex: "#eff5ff" },
      { k: "100", cls: "bg-navy-100", hex: "#dbe8fe" },
      { k: "200", cls: "bg-navy-200", hex: "#bfd7fe" },
      { k: "300", cls: "bg-navy-300", hex: "#93bbfd" },
      { k: "400", cls: "bg-navy-400", hex: "#4f93e8" },
      { k: "500", cls: "bg-navy-500", hex: "#1f6fd6" },
      { k: "600", cls: "bg-navy-600", hex: "#0153b7", logo: true },
      { k: "700", cls: "bg-navy-700", hex: "#073f96" },
      { k: "800", cls: "bg-navy-800", hex: "#032f7f", logo: true },
      { k: "900", cls: "bg-navy-900", hex: "#08245f" },
      { k: "950", cls: "bg-navy-950", hex: "#04162f" },
    ],
  },
  {
    name: "solar",
    role: "Energy. The primary action, and nothing else.",
    from: "#fcd012 — the sun behind the J",
    stops: [
      { k: "50", cls: "bg-solar-50", hex: "#fffaeb" },
      { k: "100", cls: "bg-solar-100", hex: "#fff2c6" },
      { k: "200", cls: "bg-solar-200", hex: "#ffe488" },
      { k: "300", cls: "bg-solar-300", hex: "#ffd54a" },
      { k: "400", cls: "bg-solar-400", hex: "#fcd012", logo: true },
      { k: "500", cls: "bg-solar-500", hex: "#f0ab00" },
      { k: "600", cls: "bg-solar-600", hex: "#cf8302" },
      { k: "700", cls: "bg-solar-700", hex: "#a55c06" },
      { k: "800", cls: "bg-solar-800", hex: "#86480d" },
      { k: "900", cls: "bg-solar-900", hex: "#713b11" },
    ],
  },
  {
    name: "grid",
    role: "Status only. In stock, verified, savings.",
    from: "#55a022 — the swoosh and the globe",
    stops: [
      { k: "50", cls: "bg-grid-50", hex: "#f3fbe9" },
      { k: "100", cls: "bg-grid-100", hex: "#e2f5cd" },
      { k: "200", cls: "bg-grid-200", hex: "#c6ea9f" },
      { k: "300", cls: "bg-grid-300", hex: "#a1da68" },
      { k: "400", cls: "bg-grid-400", hex: "#7cc43c" },
      { k: "500", cls: "bg-grid-500", hex: "#55a022", logo: true },
      { k: "600", cls: "bg-grid-600", hex: "#468318" },
      { k: "700", cls: "bg-grid-700", hex: "#376417" },
      { k: "800", cls: "bg-grid-800", hex: "#2e5018" },
      { k: "900", cls: "bg-grid-900", hex: "#274318" },
    ],
  },
  {
    name: "ember",
    role: "Sale and urgency. Never a primary action.",
    from: "#f49518 — the word “solar” in the logo",
    stops: [
      { k: "50", cls: "bg-ember-50", hex: "#fff6ed" },
      { k: "100", cls: "bg-ember-100", hex: "#ffe9d2" },
      { k: "300", cls: "bg-ember-300", hex: "#fbb765" },
      { k: "500", cls: "bg-ember-500", hex: "#f49518", logo: true },
      { k: "600", cls: "bg-ember-600", hex: "#dc7a0a" },
      { k: "700", cls: "bg-ember-700", hex: "#b25c0b" },
    ],
  },
  {
    name: "slate",
    role: "Surfaces, lines and body text. Tilted toward navy.",
    from: "derived — greys that sit under the brand blues without going muddy",
    stops: [
      { k: "50", cls: "bg-slate-50", hex: "#f6f7f9" },
      { k: "100", cls: "bg-slate-100", hex: "#eef0f4" },
      { k: "200", cls: "bg-slate-200", hex: "#e2e6ec" },
      { k: "300", cls: "bg-slate-300", hex: "#cbd2dd" },
      { k: "400", cls: "bg-slate-400", hex: "#9aa5b8" },
      { k: "500", cls: "bg-slate-500", hex: "#6f7c91" },
      { k: "600", cls: "bg-slate-600", hex: "#545f73" },
      { k: "700", cls: "bg-slate-700", hex: "#3f4959" },
      { k: "800", cls: "bg-slate-800", hex: "#2a3240" },
      { k: "900", cls: "bg-slate-900", hex: "#1a202b" },
      { k: "950", cls: "bg-slate-950", hex: "#0d1219" },
    ],
  },
  {
    name: "alert",
    role: "Destructive actions and failed payments.",
    from: "derived — warm brick, so it sits beside the ember rather than fighting it",
    stops: [
      { k: "50", cls: "bg-alert-50", hex: "#fef3f1" },
      { k: "100", cls: "bg-alert-100", hex: "#fde0dd" },
      { k: "500", cls: "bg-alert-500", hex: "#db4a34" },
      { k: "600", cls: "bg-alert-600", hex: "#c62f1e" },
      { k: "700", cls: "bg-alert-700", hex: "#a32316" },
    ],
  },
];

function Block({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-line pt-8">
      <h3 className="font-display text-subtitle text-strong">{title}</h3>
      {note && <p className="mt-1.5 max-w-prose text-sm text-muted">{note}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <main className="flex-1">
      {/* ---------------------------------------------------------------- */}
      <header className="relative overflow-hidden bg-chassis text-on-chassis">
        <div
          aria-hidden
          className="sun-bloom-dark pointer-events-none absolute inset-0"
        />
        <Container className="relative py-16 sm:py-24">
          <Eyebrow className="text-solar-400">
            {SITE.shortName} · Design system v1
          </Eyebrow>
          <h1 className="mt-4 max-w-3xl text-display-1 text-white">
            Built like the hardware it sells.
          </h1>
          <Rule className="mt-7" />
          <p className="mt-6 max-w-xl text-base leading-relaxed text-on-chassis-muted">
            Every colour here was sampled from the company logo. Navy is the
            chassis, gold is the energy, green is a status light. Numbers are
            tabular, borders are hairlines, and there is exactly one gradient
            in the whole system.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a className={buttonClass({ variant: "primary" })} href="#colour">
              Jump to colour
            </a>
            <a
              className={buttonClass({
                variant: "outline",
                className:
                  "border-line-on-chassis bg-transparent text-white hover:bg-white/10 hover:text-white hover:border-white/40",
              })}
              href="#components"
            >
              Components
            </a>
          </div>
        </Container>
      </header>

      {/* ---------------------------------------------------------------- */}
      <Section id="colour" tone="surface">
        <Container>
          <SectionHeader
            eyebrow="Foundations"
            title="Colour"
            lead="Six ramps. Four are lifted straight off the logo; slate and alert are derived to sit with them. Components reference semantic tokens — bg-surface, text-muted, border-line — never a raw stop."
          />
          <div className="mt-12 space-y-12">
            {ramps.map((ramp) => (
              <div key={ramp.name}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="font-display text-subtitle text-strong">
                    {ramp.name}
                  </h3>
                  <p className="text-sm text-muted">{ramp.role}</p>
                </div>
                <p className="mt-1 text-xs text-subtle">{ramp.from}</p>
                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-11">
                  {ramp.stops.map((s) => (
                    <div key={s.k}>
                      <div
                        className={`h-14 rounded-md border border-black/5 ${s.cls} ${
                          s.logo ? "ring-2 ring-solar-400 ring-offset-2" : ""
                        }`}
                      />
                      <p className="mt-1.5 numeric text-xs font-medium text-strong">
                        {s.k}
                      </p>
                      <p className="numeric text-[0.6875rem] uppercase text-subtle">
                        {s.hex}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-10 text-xs text-muted">
            <span className="mr-1.5 inline-block size-2 rounded-full bg-solar-400 ring-2 ring-solar-400 ring-offset-1" />
            Ringed stops are the exact values measured in the logo file.
          </p>
        </Container>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section tone="page">
        <Container>
          <SectionHeader
            eyebrow="Foundations"
            title="Type"
            lead="Archivo for anything stamped onto the page — headings, prices, buttons. Inter for everything read at length, because spec tables have to survive a 5-inch screen in daylight."
          />
          <div className="mt-12 space-y-8">
            {[
              ["text-display-1", "Power that stays on", "Hero, once per page"],
              ["text-display-2", "Complete solar systems", "Page titles"],
              ["text-display-3", "Inverters & batteries", "Section headings"],
              ["text-title", "Felicity 12kVA 48V", "Card and product titles"],
              ["text-subtitle", "What is included", "Sub-headings"],
            ].map(([cls, sample, use]) => (
              <div
                key={cls}
                className="flex flex-col gap-2 border-t border-line pt-6 sm:flex-row sm:items-baseline sm:gap-8"
              >
                <p className="w-44 shrink-0 font-mono text-xs text-muted">
                  {cls}
                </p>
                <p className={`${cls} min-w-0 flex-1 text-strong`}>{sample}</p>
                <p className="shrink-0 text-xs text-subtle sm:w-40 sm:text-right">
                  {use}
                </p>
              </div>
            ))}
            <div className="flex flex-col gap-2 border-t border-line pt-6 sm:flex-row sm:items-baseline sm:gap-8">
              <p className="w-44 shrink-0 font-mono text-xs text-muted">
                text-base
              </p>
              <p className="min-w-0 flex-1 leading-relaxed">
                Body copy. A 5kVA inverter paired with two 5kWh lithium
                batteries will carry a fridge, a freezer, fans, lights and a
                television through a full night without the generator.
              </p>
              <p className="shrink-0 text-xs text-subtle sm:w-40 sm:text-right">
                Prose, descriptions
              </p>
            </div>
            <div className="flex flex-col gap-2 border-t border-line pt-6 sm:flex-row sm:items-baseline sm:gap-8">
              <p className="w-44 shrink-0 font-mono text-xs text-muted">
                text-micro
              </p>
              <div className="min-w-0 flex-1">
                <Eyebrow>Continuous output</Eyebrow>
              </div>
              <p className="shrink-0 text-xs text-subtle sm:w-40 sm:text-right">
                Eyebrows, spec keys
              </p>
            </div>
          </div>
        </Container>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section id="components" tone="surface">
        <Container>
          <SectionHeader
            eyebrow="Components"
            title="Actions"
            lead="Gold means “this is the thing to do”, so a view gets one gold button. Everything else is outline, chassis or ghost."
          />

          <div className="mt-12 space-y-8">
            <Block
              title="Variants"
              note="primary · chassis · outline · ghost · danger · link"
            >
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">Add to cart</Button>
                <Button variant="chassis">Get a quote</Button>
                <Button variant="outline">Compare</Button>
                <Button variant="ghost">Save for later</Button>
                <Button variant="danger">Cancel order</Button>
                <Button variant="link">Track your order</Button>
              </div>
            </Block>

            <Block title="Sizes" note="sm 36px · md 44px · lg 52px">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" size="sm">
                  Small
                </Button>
                <Button variant="primary" size="md">
                  Medium
                </Button>
                <Button variant="primary" size="lg">
                  Large
                </Button>
                <Button variant="outline" disabled>
                  Out of stock
                </Button>
              </div>
            </Block>

            <Block
              title="Links that look like buttons"
              note="buttonClass() returns the same string for next/link and plain anchors, so navigation never has to be faked with a button."
            >
              <a className={buttonClass({ variant: "primary" })} href="#colour">
                Browse inverters
              </a>
            </Block>
          </div>
        </Container>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section tone="page">
        <Container>
          <SectionHeader
            eyebrow="Components"
            title="Status and money"
            lead="Two things a customer scans for before anything else: can I get it, and what does it cost."
          />

          <div className="mt-12 space-y-8">
            <Block title="Badges">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="positive" dot>
                  In stock
                </Badge>
                <Badge tone="warning" dot>
                  Low stock
                </Badge>
                <Badge tone="neutral" dot>
                  Available on request
                </Badge>
                <Badge tone="danger" dot>
                  Out of stock
                </Badge>
                <Badge tone="brand">Pending payment</Badge>
                <Badge tone="solar">Ready for pickup</Badge>
                <Badge tone="warning" variant="solid">
                  Sale
                </Badge>
              </div>
            </Block>

            <Block
              title="Price"
              note="The naira sign is set smaller, lifted and muted so the digits carry the weight. Tabular figures mean a column of prices lines up."
            >
              <div className="flex flex-wrap items-end gap-x-10 gap-y-6">
                <Price amount={1250000} size="xl" />
                <Price amount={845000} was={920000} size="lg" />
                <Price amount={312500} size="md" />
                <Price amount={18500} size="sm" />
              </div>
            </Block>

            <Block
              title="Spec strip"
              note="The recurring rhythm on every card, product page and quote result."
            >
              <SpecStrip
                className="max-w-xl"
                items={[
                  { label: "Output", value: "12 kVA" },
                  { label: "Voltage", value: "48 V" },
                  { label: "Warranty", value: "2 yrs" },
                ]}
              />
            </Block>
          </div>
        </Container>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section tone="surface">
        <Container>
          <SectionHeader
            eyebrow="Components"
            title="Cards"
            lead="Hairline borders do the separating. On hover a product card warms its border to gold and lifts two pixels — that is the entire interaction."
          />

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card interactive className="overflow-hidden">
              <div className="relative flex aspect-4/3 items-center justify-center bg-sunken">
                <span className="font-mono text-xs text-subtle">
                  product image
                </span>
                <Badge
                  tone="warning"
                  variant="solid"
                  className="absolute left-3 top-3"
                >
                  Sale
                </Badge>
              </div>
              <CardBody className="space-y-3">
                <Eyebrow>Felicity Solar</Eyebrow>
                <h3 className="text-subtitle text-strong">
                  12kVA 48V Hybrid Inverter
                </h3>
                <SpecStrip
                  items={[
                    { label: "Output", value: "12 kVA" },
                    { label: "Volts", value: "48 V" },
                    { label: "Warranty", value: "2 yrs" },
                  ]}
                />
                <div className="flex items-center justify-between pt-1">
                  <Price amount={845000} was={920000} />
                  <Badge tone="positive" dot>
                    In stock
                  </Badge>
                </div>
              </CardBody>
              <CardFooter>
                <Button variant="primary" size="sm" block>
                  Add to cart
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardBody className="space-y-4">
                <Eyebrow>Order summary</Eyebrow>
                <SpecList
                  items={[
                    { label: "Subtotal", value: "₦1,157,500" },
                    { label: "Delivery", value: "Paid on collection" },
                    { label: "VAT", value: "Not charged" },
                  ]}
                />
                <div className="flex items-center justify-between border-t border-line pt-4">
                  <span className="text-sm font-medium text-muted">Total</span>
                  <Price amount={1157500} size="lg" />
                </div>
              </CardBody>
            </Card>

            <Card muted>
              <CardBody className="space-y-4">
                <Eyebrow>Loading</Eyebrow>
                <Skeleton className="h-32 w-full rounded-md" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-8 w-28 rounded-md" />
              </CardBody>
            </Card>
          </div>
        </Container>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section tone="page">
        <Container>
          <SectionHeader
            eyebrow="Components"
            title="Product tiles"
            lead="The real catalogue tile in its four states. A product with no photo yet gets a drawn placeholder — solar cells under a corner sun, varied by the product's name — and one with no price says so and sends the customer to WhatsApp."
          />

          <ul className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {sampleProducts.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section id="quote-systems" tone="surface">
        <Container>
          <SectionHeader
            eyebrow="Components"
            title="Quote: systems by brand"
            lead="What the quote tool shows once products carry their ratings: one or two systems per brand, never mixed, cheapest first. The sample ratings and prices here are made up."
          />

          <div className="mt-12">
            <BrandSystems systems={sampleSystems} />
          </div>
        </Container>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section tone="page">
        <Container>
          <SectionHeader
            eyebrow="Components"
            title="The chassis panel"
            lead="Where the site stops being a catalogue and starts being an instrument: quote results, order status, the footer."
          />

          <Panel className="mt-12 overflow-hidden">
            <div className="relative overflow-hidden border-b border-line-on-chassis px-6 py-7 sm:px-8">
              <div
                aria-hidden
                className="sun-bloom-dark pointer-events-none absolute inset-0"
              />
              <div className="relative">
                <Eyebrow className="text-solar-400">
                  Recommended system · valid 7 days
                </Eyebrow>
                <h3 className="mt-3 text-display-3">5kVA Home Essential</h3>
                <p className="mt-2 max-w-md text-sm text-on-chassis-muted">
                  Cheapest engineer-approved package that covers your full load.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6 px-6 py-7 sm:grid-cols-4 sm:px-8">
              <SpecFigure
                onChassis
                label="Peak load"
                value="3,240"
                unit="W"
                note="incl. 1.25 headroom"
              />
              <SpecFigure
                onChassis
                label="Daily energy"
                value="11.4"
                unit="kWh"
              />
              <SpecFigure
                onChassis
                label="Battery"
                value="10"
                unit="kWh"
                note="lithium, 80% DoD"
              />
              <SpecFigure
                onChassis
                label="Array"
                value="3.8"
                unit="kWp"
                note="4.0 sun hours"
              />
            </div>
            <div className="flex flex-col gap-4 border-t border-line-on-chassis px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <Price amount={2480000} size="lg" onChassis />
              <div className="flex flex-wrap gap-3">
                <Button variant="primary">Send me this quote</Button>
                <Button
                  variant="outline"
                  className="border-line-on-chassis bg-transparent text-white hover:border-white/40 hover:bg-white/10 hover:text-white"
                >
                  See what is inside
                </Button>
              </div>
            </div>
          </Panel>
        </Container>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section tone="surface">
        <Container>
          <SectionHeader
            eyebrow="Components"
            title="Forms and messages"
            lead="Fields are wells you type into, not boxes floating on the page. Required is the default; optional fields are the ones that carry a label."
          />

          <div className="mt-12 grid gap-10 lg:grid-cols-2">
            <div className="space-y-5">
              <Field
                name="phone"
                label="Phone number"
                hint="We send your quote reference here on WhatsApp."
              >
                {(p) => <Input {...p} type="tel" placeholder="0803 000 0000" />}
              </Field>

              <Field name="state" label="Delivery state">
                {(p) => (
                  <Select {...p} defaultValue="">
                    <option value="" disabled>
                      Choose a state
                    </option>
                    <option>Lagos</option>
                    <option>Ogun</option>
                    <option>Oyo</option>
                    <option>Rivers</option>
                  </Select>
                )}
              </Field>

              <Field
                name="ref"
                label="Order number"
                error="We could not find that order number. Check the digits and try again."
              >
                {(p) => <Input {...p} defaultValue="JSW-0042" />}
              </Field>

              <Field name="notes" label="Delivery notes" required={false}>
                {(p) => (
                  <Textarea
                    {...p}
                    placeholder="Landmark, gate colour, who to call on arrival…"
                  />
                )}
              </Field>
            </div>

            <div className="space-y-4">
              <Notice tone="info" title="Payment is being confirmed">
                We verify every Paystack payment on our own server. Refresh the
                track-order page in a minute if this is still showing.
              </Notice>
              <Notice tone="positive" title="Payment received">
                Order JSW-0042 is now being processed.
              </Notice>
              <Notice tone="warning" title="Unpaid orders expire in 24 hours">
                Stock is released back to the shop after that.
              </Notice>
              <Notice tone="danger" title="Transfer proof not accepted">
                The uploaded image did not show the amount. Please upload the
                full receipt.
              </Notice>
              <EmptyState
                title="No products match those filters"
                description="Try removing the brand filter, or call the shop — most of the catalogue is not online yet."
                action={<Button variant="outline">Clear filters</Button>}
              />
            </div>
          </div>
        </Container>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section tone="page">
        <Container>
          <SectionHeader
            eyebrow="Foundations"
            title="Surface, edge and depth"
            lead="Shadows are rationed. A card gets a hairline; only genuinely floating things — dropdowns, modals, the sticky cart bar — get a shadow."
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["shadow-xs", "Resting buttons"],
              ["shadow-sm", "Sticky bars"],
              ["shadow-md", "Card hover, dropdowns"],
              ["shadow-lg", "Modals, image lightbox"],
            ].map(([cls, use]) => (
              <div
                key={cls}
                className={`rounded-lg border border-line bg-surface p-5 ${cls}`}
              >
                <p className="font-mono text-xs text-strong">{cls}</p>
                <p className="mt-1 text-xs text-muted">{use}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["rounded-xs", "4px"],
              ["rounded-sm", "6px"],
              ["rounded-md", "8px"],
              ["rounded-lg", "12px"],
              ["rounded-xl", "16px"],
              ["rounded-full", "badges"],
            ].map(([cls, label]) => (
              <div key={cls}>
                <div
                  className={`h-16 border border-line-strong bg-navy-50 ${cls}`}
                />
                <p className="mt-2 font-mono text-xs text-strong">{cls}</p>
                <p className="text-xs text-subtle">{label}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <footer className="bg-chassis text-on-chassis">
        <Container className="py-12">
          <Rule />
          <p className="mt-6 font-display text-subtitle text-white">
            {SITE.name}
          </p>
          <p className="mt-2 max-w-md text-sm text-on-chassis-muted">
            {SITE.slogan} · {SITE.address}
          </p>
          <p className="mt-6 text-xs text-on-chassis-muted">
            Tokens: <code className="font-mono">app/globals.css</code> ·
            Components: <code className="font-mono">components/ui</code> ·
            Rationale: <code className="font-mono">docs/DESIGN.md</code>
          </p>
        </Container>
      </footer>
    </main>
  );
}

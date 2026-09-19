"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Container,
  Eyebrow,
  Field,
  Input,
  Notice,
  Panel,
  Price,
  Select,
  SpecFigure,
  buttonClass,
} from "@/components/ui";
import { calculateQuote, saveQuoteAction } from "@/lib/quote/actions";
import type { QuoteView } from "@/lib/quote/view";
import { quoteSummary } from "@/lib/quote/summary";
import { SITE, whatsappLink } from "@/lib/site";

export interface ApplianceOption {
  slug: string;
  name: string;
  category: string;
  watts: number;
  dutyCycle: number;
  surge: number;
  highDraw: boolean;
  defaultHours: number;
}

interface Row {
  qty: number;
  hours: number;
  /** Heavy heating loads start off battery backup; the customer can switch them on. */
  onBackup: boolean;
}

interface CustomRow {
  name: string;
  watts: number;
  qty: number;
  hours: number;
}

const CATEGORY_LABEL: Record<string, string> = {
  LIGHTING: "Lighting",
  COOLING: "Cooling",
  ENTERTAINMENT: "TV and entertainment",
  KITCHEN: "Kitchen",
  WORK: "Work and devices",
  WATER: "Water",
  SECURITY: "Security",
};

const BACKUP_PRESETS = [
  { hours: 4, label: "4 hours" },
  { hours: 8, label: "8 hours" },
  { hours: 12, label: "12 hours (overnight)" },
];

const PANEL_W = 550;
const kwh = (wh: number) => (wh / 1000).toFixed(1);

export function QuoteWizard({ appliances }: { appliances: ApplianceOption[] }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [custom, setCustom] = useState<CustomRow[]>([]);
  const [draft, setDraft] = useState({ name: "", watts: "", qty: "1", hours: "5" });

  const [backupHours, setBackupHours] = useState(12);
  const [chemistry, setChemistry] = useState<"" | "lithium" | "tubular">("");
  const [state, setState] = useState("");
  const [area, setArea] = useState("");
  const [budget, setBudget] = useState("");

  const [view, setView] = useState<QuoteView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [contact, setContact] = useState({ name: "", phone: "", email: "", consent: false, website: "" });
  const [saved, setSaved] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const m = new Map<string, ApplianceOption[]>();
    for (const a of appliances) m.set(a.category, [...(m.get(a.category) ?? []), a]);
    return [...m.entries()];
  }, [appliances]);

  const rowOf = (a: ApplianceOption): Row => rows[a.slug] ?? { qty: 0, hours: a.defaultHours, onBackup: !a.highDraw };
  const setRow = (a: ApplianceOption, patch: Partial<Row>) =>
    setRows((r) => ({ ...r, [a.slug]: { ...rowOf(a), ...patch } }));

  // What we send to the server. Built from the picked rows only.
  const items = useMemo(() => {
    const lib = appliances.flatMap((a) => {
      const r = rows[a.slug];
      if (!r || r.qty < 1) return [];
      return [{ name: a.name, watts: a.watts, quantity: r.qty, hoursPerDay: r.hours, dutyCycle: a.dutyCycle, surge: a.surge, highDraw: a.highDraw, onBackup: r.onBackup }];
    });
    const cus = custom.map((c) => ({ name: c.name, watts: c.watts, quantity: c.qty, hoursPerDay: c.hours, dutyCycle: 1, surge: 1, highDraw: false, onBackup: true }));
    return [...lib, ...cus];
  }, [appliances, rows, custom]);

  const totals = useMemo(() => {
    let w = 0;
    let wh = 0;
    for (const i of items) {
      w += i.watts * i.quantity;
      wh += i.watts * i.quantity * i.hoursPerDay * i.dutyCycle;
    }
    return { w, kwh: wh / 1000 };
  }, [items]);

  const hasHighDraw = items.some((i) => i.highDraw);

  const request = () => ({
    items,
    backupHours,
    chemistry: chemistry || undefined,
    state: state || undefined,
    area: area || undefined,
    budgetNgn: budget ? Number(budget) : undefined,
  });

  function addCustom() {
    const watts = Number(draft.watts);
    const qty = Number(draft.qty);
    const hours = Number(draft.hours);
    if (!draft.name.trim() || !(watts > 0) || !(qty >= 1) || !(hours > 0 && hours <= 24)) {
      setError("For your own appliance, enter its name, watts, how many, and hours a day (up to 24).");
      return;
    }
    setError(null);
    setCustom((c) => [...c, { name: draft.name.trim(), watts, qty, hours }]);
    setDraft({ name: "", watts: "", qty: "1", hours: "5" });
  }

  function goToResults() {
    setError(null);
    startTransition(async () => {
      const res = await calculateQuote(request());
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setView(res.view);
      setSaved(null);
      setStep(3);
      window.scrollTo({ top: 0 });
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveQuoteAction(
        request(),
        { name: contact.name, phone: contact.phone, email: contact.email, consent: contact.consent },
        contact.website,
      );
      if (!res.ok) setError(res.error);
      else setSaved(res.reference);
    });
  }

  const stepLabels = ["Appliances", "Backup", "Your options"];

  return (
    <Container className="py-10 sm:py-14">
      <ol className="mb-8 grid grid-cols-3 gap-2" aria-label="Progress">
        {stepLabels.map((label, i) => {
          const n = i + 1;
          return (
            <li key={label} aria-current={step === n ? "step" : undefined}>
              <div className={`h-1 rounded-full ${n <= step ? "bg-solar-400" : "bg-line"}`} />
              <p className={`mt-2 text-sm ${n === step ? "font-semibold text-strong" : "text-muted"}`}>
                {n}. {label}
              </p>
            </li>
          );
        })}
      </ol>

      {error && <Notice tone="danger" className="mb-6">{error}</Notice>}

      {step === 1 && (
        <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-8">
            {grouped.map(([cat, list]) => (
              <section key={cat}>
                <Eyebrow>{CATEGORY_LABEL[cat] ?? cat}</Eyebrow>
                <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-surface">
                  {list.map((a) => {
                    const r = rowOf(a);
                    return (
                      <li key={a.slug} className="p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-strong">{a.name}</p>
                            <p className="text-sm text-muted numeric">{a.watts} W</p>
                          </div>
                          <div className="flex items-end gap-3">
                            <label className="text-xs text-muted">
                              How many
                              <Input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                max={100}
                                value={r.qty}
                                onChange={(e) => setRow(a, { qty: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                                className="mt-1 w-20"
                                aria-label={`${a.name}: how many`}
                              />
                            </label>
                            {r.qty > 0 && (
                              <label className="text-xs text-muted">
                                Hours a day
                                <Input
                                  type="number"
                                  inputMode="decimal"
                                  min={0.25}
                                  max={24}
                                  step={0.5}
                                  value={r.hours}
                                  onChange={(e) => setRow(a, { hours: Math.max(0.25, Math.min(24, Number(e.target.value) || 0.25)) })}
                                  className="mt-1 w-20"
                                  aria-label={`${a.name}: hours a day`}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                        {r.qty > 0 && a.highDraw && (
                          <label className="mt-3 flex items-center gap-2 text-sm text-ember-700">
                            <input
                              type="checkbox"
                              checked={r.onBackup}
                              onChange={(e) => setRow(a, { onBackup: e.target.checked })}
                              className="size-5"
                            />
                            Run this on battery backup too (uses a lot of power)
                          </label>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}

            <section>
              <Eyebrow>Something not listed?</Eyebrow>
              <Card className="mt-3">
                <CardBody className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-end">
                  <Field name="c-name" label="Appliance" required={false} hint="Watts are on the label at the back">
                    {(f) => <Input {...f} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />}
                  </Field>
                  <Field name="c-watts" label="Watts" required={false}>
                    {(f) => <Input {...f} type="number" inputMode="numeric" value={draft.watts} onChange={(e) => setDraft({ ...draft, watts: e.target.value })} />}
                  </Field>
                  <Field name="c-qty" label="How many" required={false}>
                    {(f) => <Input {...f} type="number" inputMode="numeric" value={draft.qty} onChange={(e) => setDraft({ ...draft, qty: e.target.value })} />}
                  </Field>
                  <Field name="c-hours" label="Hours a day" required={false}>
                    {(f) => <Input {...f} type="number" inputMode="decimal" value={draft.hours} onChange={(e) => setDraft({ ...draft, hours: e.target.value })} />}
                  </Field>
                  <Button variant="outline" onClick={addCustom}>Add</Button>
                </CardBody>
              </Card>
              {custom.length > 0 && (
                <ul className="mt-3 space-y-2 text-sm">
                  {custom.map((c, i) => (
                    <li key={i} className="flex items-center justify-between rounded-md border border-line bg-surface px-3 py-2">
                      <span>
                        {c.name} · {c.watts} W × {c.qty} · {c.hours} h/day
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => setCustom((x) => x.filter((_, j) => j !== i))}>
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Panel className="p-5">
              <Eyebrow className="text-solar-400">Your list so far</Eyebrow>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <SpecFigure onChassis label="Power at once" value={Math.round(totals.w).toLocaleString("en-NG")} unit="W" />
                <SpecFigure onChassis label="Used per day" value={totals.kwh.toFixed(1)} unit="kWh" />
              </div>
              {hasHighDraw && (
                <p className="mt-4 text-sm text-on-chassis-muted">
                  Heating appliances use a lot of power. We leave them off battery backup unless you tick the box.
                </p>
              )}
              <Button
                variant="primary"
                block
                className="mt-5"
                disabled={items.length === 0}
                onClick={() => {
                  setError(null);
                  setStep(2);
                  window.scrollTo({ top: 0 });
                }}
              >
                Next: backup needs
              </Button>
              {items.length === 0 && <p className="mt-2 text-xs text-on-chassis-muted">Pick at least one appliance.</p>}
            </Panel>
          </aside>
        </div>
      )}

      {step === 2 && (
        <div className="max-w-2xl space-y-6">
          <div>
            <Eyebrow>How long should the lights stay on when NEPA is off?</Eyebrow>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {BACKUP_PRESETS.map((p) => (
                <button
                  key={p.hours}
                  type="button"
                  onClick={() => setBackupHours(p.hours)}
                  aria-pressed={backupHours === p.hours}
                  className={`h-12 rounded-md border px-4 text-sm font-semibold ${backupHours === p.hours ? "border-navy-600 bg-navy-50 text-navy-800" : "border-line-strong bg-surface text-strong hover:border-navy-600"}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <Field name="chemistry" label="Battery type" required={false} hint="Not sure? Leave it and we'll compare both.">
            {(f) => (
              <Select {...f} value={chemistry} onChange={(e) => setChemistry(e.target.value as typeof chemistry)}>
                <option value="">Recommend for me</option>
                <option value="lithium">Lithium (lasts longer, lighter)</option>
                <option value="tubular">Tubular (cheaper upfront)</option>
              </Select>
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="state" label="State" required={false}>
              {(f) => <Input {...f} value={state} onChange={(e) => setState(e.target.value)} placeholder="Lagos" />}
            </Field>
            <Field name="area" label="Area" required={false}>
              {(f) => <Input {...f} value={area} onChange={(e) => setArea(e.target.value)} placeholder="Ojo, Lekki, Ikeja…" />}
            </Field>
          </div>

          <Field name="budget" label="Your budget (naira)" required={false} hint="Optional. We'll mark options above it.">
            {(f) => <Input {...f} type="number" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="2000000" />}
          </Field>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button variant="primary" onClick={goToResults} disabled={pending}>
              {pending ? "Working it out…" : "Show my options"}
            </Button>
          </div>
        </div>
      )}

      {step === 3 && view && (
        <Results
          view={view}
          chemistry={chemistry}
          saved={saved}
          contact={contact}
          setContact={setContact}
          onSave={save}
          pending={pending}
          onBack={() => setStep(2)}
        />
      )}
    </Container>
  );
}

function Results({
  view,
  chemistry,
  saved,
  contact,
  setContact,
  onSave,
  pending,
  onBack,
}: {
  view: QuoteView;
  chemistry: "" | "lithium" | "tubular";
  saved: string | null;
  contact: { name: string; phone: string; email: string; consent: boolean; website: string };
  setContact: (c: { name: string; phone: string; email: string; consent: boolean; website: string }) => void;
  onSave: () => void;
  pending: boolean;
  onBack: () => void;
}) {
  const n = view.needs;
  const panels = Math.ceil(n.arrayW / PANEL_W);
  const battery =
    chemistry === "" ? `${kwh(n.batteryWh.lithium)} kWh lithium or ${kwh(n.batteryWh.tubular)} kWh tubular` : `${kwh(n.batteryWh[chemistry])} kWh ${chemistry}`;
  const url = saved ? `${SITE.url}/solar-quote/${saved}` : undefined;
  const summary = quoteSummary(view, saved ?? undefined, url);

  return (
    <div className="space-y-8">
      <Panel className="p-6 sm:p-8">
        <Eyebrow className="text-solar-400">What your home needs</Eyebrow>
        <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <SpecFigure onChassis label="Inverter" value={Math.ceil(n.inverterContinuousW).toLocaleString("en-NG")} unit="W or more" note={`Must handle ${Math.ceil(n.inverterSurgeW).toLocaleString("en-NG")} W at start-up`} />
          <SpecFigure onChassis label="Used per day" value={(n.dailyWh / 1000).toFixed(1)} unit="kWh" />
          <SpecFigure onChassis label={`Battery for ${view.backupHours}h`} value={n.backupLoadW > 0 ? battery : "None"} />
          <SpecFigure onChassis label="Solar panels" value={`${panels}`} unit={`× ${PANEL_W} W`} note={`about ${Math.round(n.arrayW).toLocaleString("en-NG")} W in total`} />
        </div>
      </Panel>

      {view.engineerReview && (
        <Notice tone="warning" title="An engineer will check this one">
          Your list has heavy appliances on battery, or we don&apos;t have a ready package that fits. We&apos;ll confirm the right system with you.
        </Notice>
      )}

      {view.custom ? (
        <Card>
          <CardBody>
            <h2 className="text-title">Let&apos;s size this properly</h2>
            <p className="mt-2 text-muted">
              We don&apos;t have a ready-made package that covers everything you listed. Save your quote below and our engineer will call you to plan a
              system, or book a site inspection.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {view.options.map((o) => (
            <Card key={o.packageId} className="flex flex-col">
              <CardBody className="flex flex-1 flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone={o.label === "Recommended" ? "solar" : "neutral"}>{o.label}</Badge>
                  {o.overBudget && <Badge tone="warning">Above your budget</Badge>}
                </div>
                <h3 className="text-subtitle">{o.name}</h3>
                <Price amount={o.priceNgn} size="lg" />
                <p className="text-sm text-muted">
                  {o.backupHours != null ? `About ${o.backupHours.toFixed(1)} hours of backup` : "Backup depends on your list"}
                  {o.label === "Budget" && o.backupHours != null && o.backupHours < view.backupHours && ` (less than the ${view.backupHours}h you asked for)`}
                </p>
                <ul className="space-y-1 text-sm">
                  {o.components.map((c) => (
                    <li key={c.slug} className="flex justify-between gap-3">
                      <Link href={`/products/${c.slug}`} className="hover:underline">{c.name}</Link>
                      <span className="numeric text-muted">× {c.quantity}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  {o.slug && <Link href={`/products/${o.slug}`} className={buttonClass({ variant: "outline", size: "sm" })}>See package</Link>}
                  <a
                    className={buttonClass({ variant: "outline", size: "sm" })}
                    href={whatsappLink(`Hello ${SITE.shortName}, I'd like the ${o.name} from my quote${saved ? ` (${saved})` : ""}.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Order on WhatsApp
                  </a>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {saved ? (
        <Card>
          <CardBody className="space-y-4">
            <Notice tone="positive" title={`Saved. Your quote number is ${saved}`}>
              We&apos;ll be in touch on {contact.phone}. Keep this number, it is valid for 7 days.
            </Notice>
            <div className="flex flex-wrap gap-3">
              <Link href={`/solar-quote/${saved}`} className={buttonClass({ variant: "primary" })}>Open my saved quote</Link>
              <a className={buttonClass({ variant: "outline" })} href={`https://wa.me/?text=${encodeURIComponent(summary)}`} target="_blank" rel="noopener noreferrer">
                Share on WhatsApp
              </a>
              <a className={buttonClass({ variant: "outline" })} href={whatsappLink(`Hello ${SITE.shortName}, about my quote ${saved}`)} target="_blank" rel="noopener noreferrer">
                Chat with us about it
              </a>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody>
            <h2 className="text-title">Save this quote</h2>
            <p className="mt-1 text-sm text-muted">Enter your number to save it, send it to family, and let us follow up.</p>
            <form
              className="mt-5 grid gap-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                onSave();
              }}
            >
              <Field name="phone" label="WhatsApp phone number" hint="e.g. 0803 123 4567">
                {(f) => <Input {...f} type="tel" inputMode="tel" autoComplete="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />}
              </Field>
              <Field name="name" label="Your name" required={false}>
                {(f) => <Input {...f} autoComplete="name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />}
              </Field>
              <Field name="email" label="Email" required={false} className="sm:col-span-2">
                {(f) => <Input {...f} type="email" autoComplete="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />}
              </Field>
              {/* Honeypot: hidden from people, filled by bots. */}
              <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label>
                  Website
                  <input tabIndex={-1} autoComplete="off" value={contact.website} onChange={(e) => setContact({ ...contact, website: e.target.value })} />
                </label>
              </div>
              <label className="flex items-start gap-3 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  className="mt-0.5 size-5"
                  checked={contact.consent}
                  onChange={(e) => setContact({ ...contact, consent: e.target.checked })}
                />
                <span>Yes, J Solar World may call or message me about this quote.</span>
              </label>
              <div className="sm:col-span-2">
                <Button type="submit" variant="primary" disabled={pending}>
                  {pending ? "Saving…" : "Save my quote"}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <p className="text-sm text-muted">
        This is an estimate. The final design and price are confirmed after a site inspection by our engineers.
      </p>
      <Button variant="ghost" onClick={onBack}>Change my answers</Button>
    </div>
  );
}

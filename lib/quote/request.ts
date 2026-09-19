import { normalizeNgPhone } from "../phone";
import type { Chemistry, QuoteInput, QuoteItem } from "./types";

/**
 * Server actions are reachable by direct POST, so everything the wizard sends is
 * re-validated here with hard limits before it reaches the engine or the database.
 */

const MAX_ITEMS = 40;
const MAX_WATTS = 20_000;
const MAX_QTY = 100;

export interface QuoteRequest {
  input: QuoteInput;
  chemistry?: Chemistry;
  state?: string;
  area?: string;
  budgetNgn?: number;
}

export interface Contact {
  phone: string; // normalised +234…
  name?: string;
  email?: string;
  consent: true;
}

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function num(v: unknown, min: number, max: number): number | null {
  return typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : null;
}

function str(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim().slice(0, max);
  return t || undefined;
}

export function parseQuoteRequest(raw: unknown): Result<QuoteRequest> {
  if (!isObj(raw) || !Array.isArray(raw.items)) return { ok: false, error: "Invalid request" };
  if (raw.items.length === 0) return { ok: false, error: "Add at least one appliance" };
  if (raw.items.length > MAX_ITEMS) return { ok: false, error: "Too many appliances" };

  const items: QuoteItem[] = [];
  for (const it of raw.items) {
    if (!isObj(it)) return { ok: false, error: "Invalid appliance" };
    const name = str(it.name, 80);
    const watts = num(it.watts, 1, MAX_WATTS);
    const quantity = num(it.quantity, 1, MAX_QTY);
    const hoursPerDay = num(it.hoursPerDay, 0.25, 24);
    const dutyCycle = num(it.dutyCycle, 0.05, 1);
    const surge = num(it.surge, 1, 8);
    if (!name || watts == null || quantity == null || hoursPerDay == null || dutyCycle == null || surge == null) {
      return { ok: false, error: `Check the details for "${name ?? "an appliance"}"` };
    }
    items.push({
      name,
      watts,
      quantity: Math.round(quantity),
      hoursPerDay,
      dutyCycle,
      surge,
      highDraw: it.highDraw === true,
      onBackup: it.onBackup !== false,
    });
  }

  const backupHours = num(raw.backupHours, 1, 48);
  if (backupHours == null) return { ok: false, error: "Choose how many hours of backup you need" };

  const chemistry = raw.chemistry === "lithium" || raw.chemistry === "tubular" ? raw.chemistry : undefined;
  const budget = raw.budgetNgn == null || raw.budgetNgn === "" ? undefined : (num(raw.budgetNgn, 0, 1_000_000_000) ?? undefined);

  return {
    ok: true,
    data: {
      input: { items, backupHours },
      chemistry,
      state: str(raw.state, 60),
      area: str(raw.area, 100),
      budgetNgn: budget,
    },
  };
}

export function parseContact(raw: unknown): Result<Contact> {
  if (!isObj(raw)) return { ok: false, error: "Invalid request" };
  const phone = typeof raw.phone === "string" ? normalizeNgPhone(raw.phone) : null;
  if (!phone) return { ok: false, error: "Enter a valid Nigerian phone number, e.g. 0803 123 4567" };
  if (raw.consent !== true) return { ok: false, error: "Please tick the box so we can contact you about this quote" };
  const email = str(raw.email, 120);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "That email address doesn't look right" };
  return { ok: true, data: { phone, name: str(raw.name, 80), email, consent: true } };
}

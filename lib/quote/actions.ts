"use server";

import { parseContact, parseQuoteRequest } from "./request";
import { runQuote, saveQuote } from "./service";
import type { QuoteView } from "./view";

type Fail = { ok: false; error: string };

/** Compute a quote. Nothing is stored and no contact details are needed (results come before the phone number). */
export async function calculateQuote(raw: unknown): Promise<{ ok: true; view: QuoteView } | Fail> {
  const req = parseQuoteRequest(raw);
  if (!req.ok) return req;
  try {
    return { ok: true, view: await runQuote(req.data) };
  } catch (e) {
    console.error("calculateQuote failed", e);
    return { ok: false, error: "Something went wrong working out your quote. Please try again." };
  }
}

/** Save the quote and capture the lead. The phone number unlocks this step, not the results. */
export async function saveQuoteAction(raw: unknown, contactRaw: unknown, honeypot?: unknown): Promise<{ ok: true; reference: string } | Fail> {
  // Hidden field a person never fills in; bots do. Pretend success so they learn nothing.
  if (typeof honeypot === "string" && honeypot.length > 0) return { ok: true, reference: "JSW-000000" };

  const req = parseQuoteRequest(raw);
  if (!req.ok) return req;
  const contact = parseContact(contactRaw);
  if (!contact.ok) return contact;
  try {
    return { ok: true, reference: await saveQuote(req.data, contact.data) };
  } catch (e) {
    console.error("saveQuote failed", e);
    return { ok: false, error: "We couldn't save your quote. Please try again, or message us on WhatsApp." };
  }
}

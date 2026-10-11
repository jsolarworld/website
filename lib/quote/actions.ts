"use server";

import { parseContact, parseQuoteRequest } from "./request";
import { saveQuote } from "./service";
import type { QuoteView } from "./view";

type Fail = { ok: false; error: string };

/**
 * Work out a quote, save it and capture the lead, in one step. The phone number is compulsory (decided
 * 2026-10-11, replacing the PRD's "results before the phone number"): no action returns results
 * without one, so every quote a customer sees is also a lead.
 */
export async function saveQuoteAction(raw: unknown, contactRaw: unknown, honeypot?: unknown): Promise<{ ok: true; reference: string; view: QuoteView } | Fail> {
  const failed: Fail = { ok: false, error: "We couldn't prepare your quote. Please try again, or message us on WhatsApp." };
  // Hidden field a person never fills in; bots do. They get the same answer as any other failure, and no lead is made.
  if (typeof honeypot === "string" && honeypot.length > 0) return failed;

  const req = parseQuoteRequest(raw);
  if (!req.ok) return req;
  const contact = parseContact(contactRaw);
  if (!contact.ok) return contact;
  try {
    return { ok: true, ...(await saveQuote(req.data, contact.data)) };
  } catch (e) {
    console.error("saveQuote failed", e);
    return failed;
  }
}

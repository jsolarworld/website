import { toKobo } from "./rules";

/**
 * Paystack, verify-based (owner decision: no webhooks). We never trust the browser redirect or any status
 * sent by the client: a payment counts only when GET /transaction/verify/:reference, called with our secret
 * key, says success for exactly the amount we asked for.
 */

const BASE = process.env.PAYSTACK_BASE_URL ?? "https://api.paystack.co";

export interface PaystackVerifyData {
  status?: string;
  reference?: string;
  amount?: number;
  currency?: string;
}

export type Verdict =
  | { kind: "success" }
  | { kind: "pending" } // still in progress or abandoned: try again later
  | { kind: "failed"; reason: string };

/** Decide what a verify response means for a payment we created. Pure and exhaustive on purpose. */
export function evaluateVerification(expected: { reference: string; amountNgn: number }, data: PaystackVerifyData | null | undefined): Verdict {
  if (!data || typeof data !== "object") return { kind: "pending" };
  if (data.reference !== expected.reference) return { kind: "failed", reason: "Reference mismatch" };
  if (data.status === "success") {
    if (data.currency !== "NGN") return { kind: "failed", reason: "Wrong currency" };
    // A paid amount that differs from the order total is never accepted, in either direction.
    if (data.amount !== toKobo(expected.amountNgn)) return { kind: "failed", reason: "Amount does not match the order" };
    return { kind: "success" };
  }
  if (data.status === "failed" || data.status === "reversed") return { kind: "failed", reason: `Paystack status: ${data.status}` };
  return { kind: "pending" };
}

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set");
  return key;
}

async function paystack<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { Authorization: `Bearer ${secretKey()}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as { status?: boolean; message?: string; data?: T } | null;
  if (!res.ok || !json?.status) throw new Error(json?.message ?? `Paystack request failed (${res.status})`);
  return json.data as T;
}

export async function initializeTransaction(input: { email: string; amountNgn: number; reference: string; callbackUrl: string; metadata?: Record<string, unknown> }) {
  return paystack<{ authorization_url: string; access_code: string; reference: string }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: toKobo(input.amountNgn),
      currency: "NGN",
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    }),
  });
}

export async function verifyTransaction(reference: string): Promise<PaystackVerifyData | null> {
  try {
    return await paystack<PaystackVerifyData>(`/transaction/verify/${encodeURIComponent(reference)}`);
  } catch (e) {
    // Paystack answers 400 "Transaction reference not found" for a payment that was never started.
    if (e instanceof Error && /not found/i.test(e.message)) return null;
    throw e;
  }
}

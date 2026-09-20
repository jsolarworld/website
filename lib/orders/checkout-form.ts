import { normalizeNgPhone } from "../phone";

/** Validation for the checkout form. Pure, so it is tested without a browser. */

export interface CheckoutInput {
  fullName: string;
  phone: string; // +234...
  email: string;
  fulfilment: "PICKUP" | "LAGOS_DELIVERY" | "INTERSTATE_DELIVERY";
  deliveryState: string | null;
  deliveryArea: string | null;
  deliveryAddress: string | null;
  landmark: string | null;
  notes: string | null;
  method: "PAYSTACK" | "BANK_TRANSFER";
}

export type CheckoutResult = { ok: true; data: CheckoutInput } | { ok: false; errors: Record<string, string> };

interface FormLike {
  get(name: string): FormDataEntryValue | null;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseCheckoutForm(form: FormLike): CheckoutResult {
  const errors: Record<string, string> = {};
  const text = (n: string, max: number) => (typeof form.get(n) === "string" ? String(form.get(n)).trim().slice(0, max) : "");

  const fullName = text("fullName", 80);
  if (fullName.length < 3) errors.fullName = "Enter your full name";

  const phone = normalizeNgPhone(text("phone", 25));
  if (!phone) errors.phone = "Enter a valid Nigerian phone number, e.g. 0803 123 4567";

  // Paystack needs an email for every payment, and we send the order link there.
  const email = text("email", 120).toLowerCase();
  if (!EMAIL.test(email)) errors.email = "Enter your email address";

  const f = form.get("fulfilment");
  const fulfilment = f === "LAGOS_DELIVERY" || f === "INTERSTATE_DELIVERY" ? f : "PICKUP";

  let deliveryState: string | null = null;
  let deliveryArea: string | null = null;
  let deliveryAddress: string | null = null;
  if (fulfilment !== "PICKUP") {
    deliveryState = text("deliveryState", 60);
    deliveryArea = text("deliveryArea", 100);
    deliveryAddress = text("deliveryAddress", 300);
    if (!deliveryState) errors.deliveryState = "Enter the state";
    if (!deliveryArea) errors.deliveryArea = "Enter the area or town";
    if (deliveryAddress.length < 5) errors.deliveryAddress = "Enter the street address";
  }

  const method = form.get("method") === "BANK_TRANSFER" ? "BANK_TRANSFER" : form.get("method") === "PAYSTACK" ? "PAYSTACK" : null;
  if (!method) errors.method = "Choose how you will pay";

  if (form.get("terms") !== "on") errors.terms = "Please accept the terms to place your order";

  if (Object.keys(errors).length || !phone || !method) return { ok: false, errors };
  return {
    ok: true,
    data: {
      fullName,
      phone,
      email,
      fulfilment,
      deliveryState,
      deliveryArea,
      deliveryAddress,
      landmark: text("landmark", 150) || null,
      notes: text("notes", 500) || null,
      method,
    },
  };
}

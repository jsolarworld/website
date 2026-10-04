import { normalizeNgPhone } from "./phone";

/** A message from the About page's contact form, validated. Pure so it can be tested without a browser. */
export interface ContactMessage {
  name: string | null;
  /** Normalised +234… */
  phone: string;
  message: string;
}

interface FormLike {
  get(name: string): FormDataEntryValue | null;
}

export const MAX_MESSAGE = 1000;

export function parseContactMessage(form: FormLike): { ok: true; data: ContactMessage } | { ok: false; errors: Record<string, string> } {
  const text = (key: string) => {
    const v = form.get(key);
    return typeof v === "string" ? v.trim() : "";
  };
  const errors: Record<string, string> = {};
  const phone = normalizeNgPhone(text("phone"));
  if (!phone) errors.phone = "Enter a Nigerian phone number, e.g. 0803 123 4567";
  const message = text("message").replace(/\s+\n/g, "\n");
  if (message.length < 5) errors.message = "Tell us briefly what you need";
  else if (message.length > MAX_MESSAGE) errors.message = `Keep it under ${MAX_MESSAGE} characters`;
  const name = text("name").slice(0, 80) || null;
  if (Object.keys(errors).length > 0 || !phone) return { ok: false, errors };
  return { ok: true, data: { name, phone, message } };
}

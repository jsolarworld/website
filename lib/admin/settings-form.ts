/** Validation for the admin settings form. Pure, so it is tested without a browser. */

export interface SettingsInput {
  bank: { bankName: string; accountNumber: string; accountName: string };
  holdHours: number;
}

export type SettingsResult = { ok: true; data: SettingsInput } | { ok: false; errors: Record<string, string> };

interface FormLike {
  get(name: string): FormDataEntryValue | null;
}

export function parseSettingsForm(form: FormLike): SettingsResult {
  const errors: Record<string, string> = {};
  const text = (n: string, max: number) => (typeof form.get(n) === "string" ? String(form.get(n)).trim().slice(0, max) : "");

  const bankName = text("bankName", 60);
  if (bankName.length < 2) errors.bankName = "Enter the bank name";

  // Nigerian bank accounts (NUBAN) are exactly 10 digits. Spaces and dashes typed by a person are ignored.
  const accountNumber = text("accountNumber", 20).replace(/[\s-]/g, "");
  if (!/^\d{10}$/.test(accountNumber)) errors.accountNumber = "An account number is exactly 10 digits";

  const accountName = text("accountName", 80).toUpperCase();
  if (accountName.length < 3) errors.accountName = "Enter the account name exactly as the bank shows it";

  const hold = Number(text("holdHours", 5));
  if (!Number.isInteger(hold) || hold < 1 || hold > 168) errors.holdHours = "Choose from 1 to 168 hours (a week)";

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data: { bank: { bankName, accountNumber, accountName }, holdHours: hold } };
}

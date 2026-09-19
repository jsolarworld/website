/**
 * Normalise a Nigerian mobile number to +234XXXXXXXXXX, or null if it isn't one.
 * Accepts 0803…, 803…, 234803…, +234 803 … with spaces or dashes.
 */
export function normalizeNgPhone(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, "");
  const m = /^(?:\+?234|0)?([789][01]\d{8})$/.exec(digits);
  return m ? `+234${m[1]}` : null;
}

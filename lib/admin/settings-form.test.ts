import { describe, expect, it } from "vitest";
import { parseSettingsForm } from "./settings-form";

function form(fields: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}
const good = { bankName: "FCMB", accountNumber: "1049984602", accountName: "j solar world energy", holdHours: "24" };

describe("parseSettingsForm", () => {
  it("accepts the real account and upper-cases the name", () => {
    const r = parseSettingsForm(form(good));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.bank).toEqual({ bankName: "FCMB", accountNumber: "1049984602", accountName: "J SOLAR WORLD ENERGY" });
      expect(r.data.holdHours).toBe(24);
    }
  });

  it("strips spaces and dashes from the account number", () => {
    const r = parseSettingsForm(form({ ...good, accountNumber: "1049 984-602" }));
    expect(r.ok && r.data.bank.accountNumber).toBe("1049984602");
  });

  it.each(["123456789", "12345678901", "abcdefghij", ""])("rejects account number %j", (n) => {
    const r = parseSettingsForm(form({ ...good, accountNumber: n }));
    expect(!r.ok && r.errors.accountNumber).toBeTruthy();
  });

  it("rejects missing names and out-of-range hold hours", () => {
    expect(parseSettingsForm(form({ ...good, bankName: "" })).ok).toBe(false);
    expect(parseSettingsForm(form({ ...good, accountName: "x" })).ok).toBe(false);
    expect(parseSettingsForm(form({ ...good, holdHours: "0" })).ok).toBe(false);
    expect(parseSettingsForm(form({ ...good, holdHours: "500" })).ok).toBe(false);
    expect(parseSettingsForm(form({ ...good, holdHours: "1.5" })).ok).toBe(false);
  });
});

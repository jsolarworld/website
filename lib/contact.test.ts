import { describe, expect, it } from "vitest";
import { MAX_MESSAGE, parseContactMessage } from "./contact";

const form = (fields: Record<string, string>) => ({ get: (k: string) => fields[k] ?? null });

describe("parseContactMessage", () => {
  it("accepts a name, a Nigerian number in any common format, and a message", () => {
    const r = parseContactMessage(form({ name: " Ade ", phone: "0803 123 4567", message: "I need a 5kVA inverter quote" }));
    expect(r).toEqual({ ok: true, data: { name: "Ade", phone: "+2348031234567", message: "I need a 5kVA inverter quote" } });
  });

  it("makes the name optional", () => {
    const r = parseContactMessage(form({ phone: "+234 803 123 4567", message: "Hello there" }));
    expect(r.ok && r.data.name).toBeNull();
  });

  it("asks for a valid phone and a real message", () => {
    const r = parseContactMessage(form({ phone: "12345", message: "hi" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["message", "phone"]);
  });

  it("refuses a message that is too long", () => {
    const r = parseContactMessage(form({ phone: "08031234567", message: "a".repeat(MAX_MESSAGE + 1) }));
    expect(r.ok).toBe(false);
  });
});

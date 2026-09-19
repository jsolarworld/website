import { describe, expect, it } from "vitest";
import { normalizeNgPhone } from "./phone";

describe("normalizeNgPhone", () => {
  it.each([
    ["08100362453", "+2348100362453"],
    ["0810 036 2453", "+2348100362453"],
    ["+234 810 036 2453", "+2348100362453"],
    ["2349044871185", "+2349044871185"],
    ["9044871185", "+2349044871185"],
    ["0708-574-5503", "+2347085745503"],
  ])("accepts %s", (input, expected) => {
    expect(normalizeNgPhone(input)).toBe(expected);
  });

  it.each(["", "12345", "0610036245", "081003624", "081003624533", "abc"])("rejects %s", (input) => {
    expect(normalizeNgPhone(input)).toBeNull();
  });
});

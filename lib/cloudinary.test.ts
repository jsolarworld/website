import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseCloudinaryUrl, signParams } from "./cloudinary";

describe("parseCloudinaryUrl", () => {
  it("splits key, secret and cloud name", () => {
    expect(parseCloudinaryUrl("cloudinary://123:abc_DEF@mycloud")).toEqual({ apiKey: "123", apiSecret: "abc_DEF", cloudName: "mycloud" });
  });

  it("returns null for anything else", () => {
    expect(parseCloudinaryUrl(undefined)).toBeNull();
    expect(parseCloudinaryUrl("https://example.com")).toBeNull();
  });
});

describe("signParams", () => {
  it("signs alphabetically sorted k=v pairs joined by & plus the secret", () => {
    const expected = createHash("sha1").update("folder=f&timestamp=1315060510abcd").digest("hex");
    expect(signParams({ timestamp: 1315060510, folder: "f" }, "abcd")).toBe(expected);
  });

  it("changes when any param changes", () => {
    expect(signParams({ timestamp: 1, folder: "a" }, "s")).not.toBe(signParams({ timestamp: 1, folder: "b" }, "s"));
  });
});

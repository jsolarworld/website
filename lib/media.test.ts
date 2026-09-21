import { describe, expect, it } from "vitest";
import { coverOf, isCloudinaryMedia, kindOfFile, videoPoster, videoSrc } from "./media";

const IMG = "https://res.cloudinary.com/demo/image/upload/v1/j-solar-world/products/a.jpg";
const VID = "https://res.cloudinary.com/demo/video/upload/v1/j-solar-world/products/b.mp4";

describe("media helpers", () => {
  it("accepts only Cloudinary uploads of the matching type", () => {
    expect(isCloudinaryMedia("IMAGE", IMG)).toBe(true);
    expect(isCloudinaryMedia("VIDEO", VID)).toBe(true);
    expect(isCloudinaryMedia("VIDEO", IMG)).toBe(false);
    expect(isCloudinaryMedia("IMAGE", VID)).toBe(false);
    expect(isCloudinaryMedia("IMAGE", "https://evil.example/image/upload/a.jpg")).toBe(false);
    expect(isCloudinaryMedia("IMAGE", "http://res.cloudinary.com/demo/image/upload/a.jpg")).toBe(false);
  });

  it("classifies picked files", () => {
    expect(kindOfFile({ type: "image/jpeg" })).toBe("IMAGE");
    expect(kindOfFile({ type: "video/mp4" })).toBe("VIDEO");
    expect(kindOfFile({ type: "video/quicktime" })).toBe("VIDEO");
    expect(kindOfFile({ type: "application/pdf" })).toBeNull();
    expect(kindOfFile({ type: "image/svg+xml" })).toBeNull();
  });

  it("derives a still frame and a web rendition from a video URL", () => {
    expect(videoPoster(VID)).toBe("https://res.cloudinary.com/demo/video/upload/so_0,f_jpg,q_auto,w_800/v1/j-solar-world/products/b.jpg");
    expect(videoSrc(VID)).toContain("/video/upload/f_auto,q_auto/v1/");
    // Not a Cloudinary video path: left alone.
    expect(videoPoster(IMG)).toBe(IMG);
  });

  it("uses the first photo as the cover, falling back to a video's still frame", () => {
    const clip = { kind: "VIDEO" as const, url: VID, alt: "Unboxing" };
    const photo = { kind: "IMAGE" as const, url: IMG, alt: "Front" };
    expect(coverOf([clip, photo])).toEqual({ url: IMG, alt: "Front" });
    expect(coverOf([clip])?.url).toBe(videoPoster(VID));
    expect(coverOf([])).toBeNull();
  });
});

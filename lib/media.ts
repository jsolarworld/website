/**
 * Product photos and videos. Pure (no node imports) so the browser uploader, the form parser and the
 * storefront all share one definition.
 */

export type MediaKind = "IMAGE" | "VIDEO";

export interface MediaItem {
  kind: MediaKind;
  url: string;
  alt: string;
}

export const MAX_MEDIA = 12;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
/** Cloudinary's free plan caps a video at 100 MB; phone clips from WhatsApp are far smaller. */
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export const IMAGE_FORMATS = "jpg,jpeg,png,webp";
export const VIDEO_FORMATS = "mp4,mov,webm";

const CLOUDINARY_IMAGE = /^https:\/\/res\.cloudinary\.com\/[^/\s]+\/image\/upload\/\S+$/;
const CLOUDINARY_VIDEO = /^https:\/\/res\.cloudinary\.com\/[^/\s]+\/video\/upload\/\S+$/;

/** A stored URL must be a Cloudinary upload of the matching type, so a forged form can't point a product at another site. */
export function isCloudinaryMedia(kind: MediaKind, url: string): boolean {
  return (kind === "VIDEO" ? CLOUDINARY_VIDEO : CLOUDINARY_IMAGE).test(url);
}

/** The kind a picked file should be uploaded as, or null if it is neither. */
export function kindOfFile(file: { type: string }): MediaKind | null {
  if (/^image\/(jpeg|png|webp)$/.test(file.type)) return "IMAGE";
  if (/^video\/(mp4|quicktime|webm)$/.test(file.type)) return "VIDEO";
  return null;
}

const VIDEO_PATH = "/video/upload/";

/** Web-friendly rendition of an uploaded video (Cloudinary picks the codec, and compresses phone footage). */
export function videoSrc(url: string): string {
  return url.includes(VIDEO_PATH) ? url.replace(VIDEO_PATH, `${VIDEO_PATH}f_auto,q_auto/`) : url;
}

/** A still frame from the first second of a video, shown before it plays and as its thumbnail. */
export function videoPoster(url: string): string {
  if (!url.includes(VIDEO_PATH)) return url;
  return url.replace(VIDEO_PATH, `${VIDEO_PATH}so_0,f_jpg,q_auto,w_800/`).replace(/\.[a-z0-9]+(\?.*)?$/i, ".jpg");
}

/** The picture to show on cards, in carts and in search results: the first photo, else a video's still frame. */
export function coverOf(media: MediaItem[]): { url: string; alt: string } | null {
  const photo = media.find((m) => m.kind === "IMAGE");
  if (photo) return { url: photo.url, alt: photo.alt };
  const clip = media.find((m) => m.kind === "VIDEO");
  return clip ? { url: videoPoster(clip.url), alt: clip.alt } : null;
}

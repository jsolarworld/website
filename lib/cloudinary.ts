import { createHash } from "node:crypto";

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

/** Parse CLOUDINARY_URL (cloudinary://API_KEY:API_SECRET@CLOUD_NAME). */
export function parseCloudinaryUrl(url: string | undefined): CloudinaryConfig | null {
  const m = /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(url ?? "");
  return m ? { apiKey: m[1], apiSecret: m[2], cloudName: m[3] } : null;
}

/** Cloudinary's signature: sort params by name, join as k=v with &, append the secret, SHA-1. */
export function signParams(params: Record<string, string | number>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(toSign + apiSecret).digest("hex");
}

export const UPLOAD_FOLDER = "j-solar-world/products";
export const ALLOWED_FORMATS = "jpg,jpeg,png,webp";

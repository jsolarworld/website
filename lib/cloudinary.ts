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

export const PROOF_FOLDER = "j-solar-world/proofs";

/** Upload one image from the server (used for transfer receipts, so no public signing endpoint is needed). */
export async function uploadImageFromServer(file: Blob, filename: string, folder: string): Promise<string> {
  const cfg = parseCloudinaryUrl(process.env.CLOUDINARY_URL);
  if (!cfg) throw new Error("Image uploads are not configured");
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { allowed_formats: ALLOWED_FORMATS, folder, timestamp };
  const body = new FormData();
  body.set("file", file, filename);
  body.set("api_key", cfg.apiKey);
  body.set("timestamp", String(timestamp));
  body.set("signature", signParams(params, cfg.apiSecret));
  body.set("folder", folder);
  body.set("allowed_formats", ALLOWED_FORMATS);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`, { method: "POST", body });
  const json = (await res.json().catch(() => null)) as { secure_url?: string; error?: { message?: string } } | null;
  if (!res.ok || !json?.secure_url) throw new Error(json?.error?.message ?? "Upload failed");
  return json.secure_url;
}

import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/admin/guard";
import { ALLOWED_FORMATS, UPLOAD_FOLDER, parseCloudinaryUrl, signParams } from "@/lib/cloudinary";

/**
 * Signed-upload parameters for the browser. Only staff who can edit the catalogue get one, and the
 * signature pins the folder and file formats, so the key can't be used to upload anything else.
 */
export async function POST() {
  await requireStaff("catalogue:write");
  const cfg = parseCloudinaryUrl(process.env.CLOUDINARY_URL);
  if (!cfg) return NextResponse.json({ error: "Image uploads are not configured" }, { status: 500 });

  const timestamp = Math.floor(Date.now() / 1000);
  const params = { allowed_formats: ALLOWED_FORMATS, folder: UPLOAD_FOLDER, timestamp };
  return NextResponse.json({
    ...params,
    signature: signParams(params, cfg.apiSecret),
    apiKey: cfg.apiKey,
    cloudName: cfg.cloudName,
  });
}

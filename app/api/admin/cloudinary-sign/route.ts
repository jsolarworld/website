import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/admin/guard";
import { UPLOAD_FOLDER, parseCloudinaryUrl, signParams } from "@/lib/cloudinary";
import { IMAGE_FORMATS, VIDEO_FORMATS } from "@/lib/media";

/**
 * Signed-upload parameters for the browser. Only staff who can edit the catalogue get one, and the
 * signature pins the folder and file formats, so the key can't be used to upload anything else.
 * Body: { kind: "IMAGE" | "VIDEO" } (defaults to IMAGE).
 */
export async function POST(req: Request) {
  await requireStaff("catalogue:write");
  const cfg = parseCloudinaryUrl(process.env.CLOUDINARY_URL);
  if (!cfg) return NextResponse.json({ error: "Image uploads are not configured" }, { status: 500 });

  const body = (await req.json().catch(() => null)) as { kind?: string } | null;
  const resourceType = body?.kind === "VIDEO" ? "video" : "image";

  const timestamp = Math.floor(Date.now() / 1000);
  const params = { allowed_formats: resourceType === "video" ? VIDEO_FORMATS : IMAGE_FORMATS, folder: UPLOAD_FOLDER, timestamp };
  return NextResponse.json({
    ...params,
    resourceType,
    signature: signParams(params, cfg.apiSecret),
    apiKey: cfg.apiKey,
    cloudName: cfg.cloudName,
  });
}

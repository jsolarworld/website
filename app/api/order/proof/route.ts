import { NextResponse } from "next/server";
import { PROOF_FOLDER, uploadImageFromServer } from "@/lib/cloudinary";
import { db } from "@/lib/db";
import { normalizeOrderNumber } from "@/lib/orders/rules";
import { tokenOk } from "@/lib/orders/service";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * A customer's bank-transfer receipt. Uploaded through the server (no public signing endpoint), and only for an
 * order whose link token is valid. It never marks anything paid: staff confirm the money in the bank app.
 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const orderNumber = normalizeOrderNumber(String(form?.get("orderNumber") ?? ""));
  const token = String(form?.get("token") ?? "");

  if (!form || !(file instanceof File) || !orderNumber || !tokenOk(orderNumber, token)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!TYPES.has(file.type)) return NextResponse.json({ error: "Please upload a photo or screenshot (JPG, PNG or WebP)." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "That image is over 5 MB. Please send a smaller one." }, { status: 400 });

  const payment = await db.payment.findFirst({
    where: { method: "BANK_TRANSFER", status: { in: ["PENDING", "PROOF_SUBMITTED"] }, order: { orderNumber, status: "PENDING_PAYMENT" } },
    orderBy: { createdAt: "desc" },
  });
  if (!payment) return NextResponse.json({ error: "This order is not waiting for a transfer." }, { status: 400 });

  let url: string;
  try {
    url = await uploadImageFromServer(file, `receipt-${orderNumber}`, PROOF_FOLDER);
  } catch (e) {
    console.error("proof upload failed", e);
    return NextResponse.json({ error: "The upload failed. Please try again." }, { status: 502 });
  }

  await db.$transaction([
    db.payment.update({ where: { id: payment.id }, data: { proofUrl: url, status: "PROOF_SUBMITTED" } }),
    db.orderEvent.create({ data: { orderId: payment.orderId, from: "PENDING_PAYMENT", to: "PENDING_PAYMENT", note: "Customer uploaded a transfer receipt" } }),
  ]);
  return NextResponse.json({ ok: true });
}

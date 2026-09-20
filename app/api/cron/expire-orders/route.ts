import { NextResponse } from "next/server";
import { expireStaleOrders } from "@/lib/orders/service";

/**
 * Daily sweep (see vercel.json): re-verifies open Paystack payments, then cancels unpaid orders past their hold and
 * puts the stock back. Vercel Cron sends `Authorization: Bearer $CRON_SECRET`; anything else is refused.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await expireStaleOrders(100);
  return NextResponse.json(result);
}

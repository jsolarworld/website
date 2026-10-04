"use server";

import { revalidatePath } from "next/cache";
import { parseBooking } from "@/lib/bookings";
import { db } from "@/lib/db";

export interface BookingState {
  /** Short reference shown on screen once the booking is saved. */
  reference?: string;
  errors?: Record<string, string>;
  message?: string;
}

/** More bookings than this from one number in a day are treated as spam. */
const DAILY_LIMIT = 3;

/** The booking form on each service page. Publicly POSTable, so everything is re-checked here. Lands in /admin/bookings. */
export async function bookService(_prev: BookingState, formData: FormData): Promise<BookingState> {
  // Hidden field a person never fills in; bots do. Pretend success so they learn nothing.
  if (String(formData.get("website") ?? "") !== "") return { reference: "BK-000000" };

  try {
    const services = await db.service.findMany({ where: { published: true }, select: { id: true } });
    const parsed = parseBooking(
      formData,
      services.map((s) => s.id),
    );
    if (!parsed.ok) return { errors: parsed.errors };

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await db.serviceBooking.count({ where: { phone: parsed.data.phone, createdAt: { gte: since } } });
    if (recent >= DAILY_LIMIT) return { message: "We already have your bookings from today. We'll call you to confirm them." };

    const booking = await db.serviceBooking.create({ data: parsed.data, select: { id: true } });
    revalidatePath("/admin/bookings");
    return { reference: `BK-${booking.id.slice(-6).toUpperCase()}` };
  } catch (e) {
    console.error("bookService failed", e);
    return { message: "We couldn't save your booking. Please try again, or message us on WhatsApp." };
  }
}

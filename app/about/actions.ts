"use server";

import { revalidatePath } from "next/cache";
import { parseContactMessage } from "@/lib/contact";
import { db } from "@/lib/db";

export interface ContactState {
  sent?: boolean;
  errors?: Record<string, string>;
  message?: string;
}

/** More than this many messages from one number in a day is treated as spam. */
const DAILY_LIMIT = 3;

/** The About page's contact form. Publicly POSTable, so everything is re-checked here. Lands in /admin/leads. */
export async function sendContactMessage(_prev: ContactState, formData: FormData): Promise<ContactState> {
  // Hidden field a person never fills in; bots do. Pretend success so they learn nothing.
  if (String(formData.get("website") ?? "") !== "") return { sent: true };

  const parsed = parseContactMessage(formData);
  if (!parsed.ok) return { errors: parsed.errors };
  const { name, phone, message } = parsed.data;

  try {
    const recent = await db.lead.count({ where: { phone, source: "CONTACT_FORM", createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
    if (recent >= DAILY_LIMIT) return { sent: true };
    // They asked us to get back to them, which is the consent to contact.
    await db.lead.create({ data: { source: "CONTACT_FORM", name, phone, message, consent: true } });
  } catch (e) {
    console.error("sendContactMessage failed", e);
    return { message: "We couldn't send your message. Please try again, or message us on WhatsApp." };
  }
  revalidatePath("/admin/leads");
  return { sent: true };
}

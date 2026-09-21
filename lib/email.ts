import "server-only";
import { SITE } from "./site";

export interface Email {
  to: string;
  subject: string;
  text: string;
}

/**
 * Send a plain-text email through Resend's HTTP API (no SDK needed).
 * `EMAIL_FROM` must be an address on a domain verified in Resend, e.g. "J Solar World <hello@yourdomain.com>".
 * Until RESEND_API_KEY is set nothing is sent: in development the message is printed to the terminal so the flow
 * can be tried; in production it is NOT logged (a reset link in a log is a working password reset).
 */
export async function sendEmail(mail: Email): Promise<{ sent: boolean }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n[email not sent: RESEND_API_KEY is not set]\nTo: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}\n`);
    } else {
      console.warn(`[email not sent: RESEND_API_KEY is not set] "${mail.subject}"`);
    }
    return { sent: false };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? `${SITE.shortName} <onboarding@resend.dev>`,
        to: [mail.to],
        subject: mail.subject,
        text: mail.text,
      }),
    });
    if (!res.ok) console.error(`[email failed] Resend answered ${res.status}`);
    return { sent: res.ok };
  } catch (e) {
    console.error("[email failed]", e instanceof Error ? e.message : e);
    return { sent: false };
  }
}

"use client";

import { keepValues } from "@/lib/keep-form";
import { useActionState } from "react";
import { sendContactMessage, type ContactState } from "@/app/about/actions";
import { Button, Field, Input, Notice, Textarea } from "@/components/ui";
import { MAX_MESSAGE } from "@/lib/contact";

export function ContactForm() {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContactMessage, {});
  const e = state.errors ?? {};

  if (state.sent) {
    return (
      <Notice tone="positive" title="Message sent">
        Thank you. We&apos;ll call or WhatsApp you on the number you gave, usually the same day.
      </Notice>
    );
  }

  return (
    <form action={action} onSubmit={keepValues(action)} className="grid gap-5 sm:grid-cols-2">
      {state.message && <Notice tone="danger" className="sm:col-span-2">{state.message}</Notice>}
      <Field name="phone" label="WhatsApp phone number" error={e.phone} hint="e.g. 0803 123 4567">
        {(f) => <Input {...f} type="tel" inputMode="tel" autoComplete="tel" />}
      </Field>
      <Field name="name" label="Your name" required={false}>
        {(f) => <Input {...f} autoComplete="name" maxLength={80} />}
      </Field>
      <Field name="message" label="How can we help?" error={e.message} className="sm:col-span-2">
        {(f) => <Textarea {...f} rows={4} maxLength={MAX_MESSAGE} />}
      </Field>
      {/* Honeypot: hidden from people, filled by bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" variant="chassis" disabled={pending}>
          {pending ? "Sending…" : "Send message"}
        </Button>
      </div>
    </form>
  );
}

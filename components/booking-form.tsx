"use client";

import { keepValues } from "@/lib/keep-form";
import { useActionState } from "react";
import { bookService, type BookingState } from "@/app/services/actions";
import { Button, Field, Input, Notice, Select, Textarea } from "@/components/ui";
import { NG_STATES, TIME_WINDOWS, bookingDateRange } from "@/lib/bookings";
import { SITE, whatsappLink } from "@/lib/site";

export function BookingForm({ services, initialServiceId }: { services: { id: string; name: string }[]; initialServiceId?: string }) {
  const [state, action, pending] = useActionState<BookingState, FormData>(bookService, {});
  const e = state.errors ?? {};
  const { min: today, max: latest } = bookingDateRange();

  if (state.reference) {
    return (
      <Notice tone="positive" title={`Booked. Your reference is ${state.reference}`}>
        We&apos;ll call or WhatsApp you to confirm the day and any visit or transport fee.{" "}
        <a href={whatsappLink(`Hello ${SITE.shortName}, about my booking ${state.reference}`)} className="underline underline-offset-4" target="_blank" rel="noopener noreferrer">
          Message us about it
        </a>
      </Notice>
    );
  }

  return (
    <form action={action} onSubmit={keepValues(action)} className="grid gap-5 sm:grid-cols-2">
      {state.message && <Notice tone="danger" className="sm:col-span-2">{state.message}</Notice>}
      <Field name="serviceId" label="Service" error={e.serviceId} className="sm:col-span-2">
        {(f) => (
          <Select {...f} defaultValue={initialServiceId ?? ""}>
            <option value="">Choose…</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field name="name" label="Your name" error={e.name}>
        {(f) => <Input {...f} autoComplete="name" maxLength={80} />}
      </Field>
      <Field name="phone" label="WhatsApp phone number" error={e.phone} hint="e.g. 0803 123 4567">
        {(f) => <Input {...f} type="tel" inputMode="tel" autoComplete="tel" />}
      </Field>
      <Field name="email" label="Email" required={false} error={e.email} className="sm:col-span-2">
        {(f) => <Input {...f} type="email" autoComplete="email" />}
      </Field>
      <Field name="state" label="State" error={e.state}>
        {(f) => (
          <Select {...f} defaultValue="Lagos">
            {NG_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field name="area" label="Area" error={e.area} hint="e.g. Ojo, Lekki, Ikeja">
        {(f) => <Input {...f} autoComplete="address-level2" maxLength={80} />}
      </Field>
      <Field name="address" label="Address of the site" error={e.address} className="sm:col-span-2">
        {(f) => <Input {...f} autoComplete="street-address" maxLength={200} />}
      </Field>
      <Field name="preferredDate" label="Preferred day" required={false} error={e.preferredDate} hint="Leave empty for the soonest day">
        {(f) => <Input {...f} type="date" min={today} max={latest} />}
      </Field>
      <Field name="timeWindow" label="Preferred time" required={false} error={e.timeWindow}>
        {(f) => (
          <Select {...f} defaultValue="">
            <option value="">Any time</option>
            {TIME_WINDOWS.filter((t) => t !== "Any time").map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field name="notes" label="Anything we should know?" required={false} className="sm:col-span-2" hint="e.g. what you want to power, roof type, current inverter">
        {(f) => <Textarea {...f} rows={3} maxLength={1000} />}
      </Field>
      {/* Honeypot: hidden from people, filled by bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Booking…" : "Book this service"}
        </Button>
      </div>
    </form>
  );
}

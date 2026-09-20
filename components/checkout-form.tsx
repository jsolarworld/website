"use client";

import { useActionState, useState } from "react";
import { placeOrder, type CheckoutState } from "@/app/checkout/actions";
import { Button, Card, CardBody, Eyebrow, Field, Input, Notice, Textarea } from "@/components/ui";

export function CheckoutForm({ paystackReady }: { paystackReady: boolean }) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(placeOrder, {});
  const [fulfilment, setFulfilment] = useState("PICKUP");
  const e = state.errors ?? {};

  return (
    <form action={action} className="space-y-6">
      {state.error && <Notice tone="danger">{state.error}</Notice>}
      {Object.keys(e).length > 0 && <Notice tone="danger" title="Please fix the highlighted fields" />}

      <Card>
        <CardBody className="grid gap-5 sm:grid-cols-2">
          <Eyebrow className="sm:col-span-2">Your details</Eyebrow>
          <Field name="fullName" label="Full name" error={e.fullName} className="sm:col-span-2">
            {(f) => <Input {...f} autoComplete="name" />}
          </Field>
          <Field name="phone" label="Phone (WhatsApp)" error={e.phone} hint="We call or message you about your order">
            {(f) => <Input {...f} type="tel" inputMode="tel" autoComplete="tel" />}
          </Field>
          <Field name="email" label="Email" error={e.email} hint="Payment receipts and your order link">
            {(f) => <Input {...f} type="email" autoComplete="email" />}
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-5">
          <Eyebrow>Getting your order</Eyebrow>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["PICKUP", "Collect at our shop", "Alaba International Market. Free."],
              ["LAGOS_DELIVERY", "Delivery in Lagos", "Transport cost confirmed by us before dispatch."],
              ["INTERSTATE_DELIVERY", "Delivery to another state", "Transport cost confirmed by us before dispatch."],
            ].map(([value, title, sub]) => (
              <label key={value} className={`cursor-pointer rounded-lg border p-4 text-sm ${fulfilment === value ? "border-navy-600 bg-navy-50" : "border-line-strong bg-surface"}`}>
                <input type="radio" name="fulfilment" value={value} checked={fulfilment === value} onChange={() => setFulfilment(value)} className="sr-only" />
                <span className="block font-semibold text-strong">{title}</span>
                <span className="mt-1 block text-muted">{sub}</span>
              </label>
            ))}
          </div>

          {fulfilment !== "PICKUP" && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field name="deliveryState" label="State" error={e.deliveryState}>
                {(f) => <Input {...f} defaultValue={fulfilment === "LAGOS_DELIVERY" ? "Lagos" : ""} />}
              </Field>
              <Field name="deliveryArea" label="Area or town" error={e.deliveryArea}>
                {(f) => <Input {...f} />}
              </Field>
              <Field name="deliveryAddress" label="Street address" error={e.deliveryAddress} className="sm:col-span-2">
                {(f) => <Input {...f} autoComplete="street-address" />}
              </Field>
              <Field name="landmark" label="Nearest landmark" required={false} className="sm:col-span-2">
                {(f) => <Input {...f} />}
              </Field>
            </div>
          )}
          <Field name="notes" label="Anything we should know?" required={false}>
            {(f) => <Textarea {...f} rows={2} />}
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <Eyebrow>How will you pay?</Eyebrow>
          {e.method && <p className="text-sm text-alert-600">{e.method}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={`rounded-lg border border-line-strong bg-surface p-4 text-sm ${paystackReady ? "cursor-pointer has-[:checked]:border-navy-600 has-[:checked]:bg-navy-50" : "opacity-50"}`}>
              <input type="radio" name="method" value="PAYSTACK" defaultChecked={paystackReady} disabled={!paystackReady} className="sr-only" />
              <span className="block font-semibold text-strong">Pay online now</span>
              <span className="mt-1 block text-muted">Card, bank transfer or USSD through Paystack. Confirmed instantly.</span>
            </label>
            <label className="cursor-pointer rounded-lg border border-line-strong bg-surface p-4 text-sm has-[:checked]:border-navy-600 has-[:checked]:bg-navy-50">
              <input type="radio" name="method" value="BANK_TRANSFER" defaultChecked={!paystackReady} className="sr-only" />
              <span className="block font-semibold text-strong">Bank transfer to our account</span>
              <span className="mt-1 block text-muted">We show you the account after you place the order. Upload your receipt and we confirm it.</span>
            </label>
          </div>
        </CardBody>
      </Card>

      {/* Honeypot: hidden from people, filled by bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="terms" className="mt-0.5 size-5" />
          <span>
            I agree to the <a href="/terms" className="underline">terms of sale</a>, the <a href="/returns-and-warranty" className="underline">returns and warranty policy</a> and the{" "}
            <a href="/privacy" className="underline">privacy policy</a>. Returns are only accepted for unopened, unused items on the day of purchase.
          </span>
        </label>
        {e.terms && <p className="mt-1 text-sm text-alert-600">{e.terms}</p>}
      </div>

      <Button type="submit" variant="primary" size="lg" disabled={pending}>
        {pending ? "Placing your order…" : "Place order"}
      </Button>
    </form>
  );
}

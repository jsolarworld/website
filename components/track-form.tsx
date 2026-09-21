"use client";

import { keepValues } from "@/lib/keep-form";
import { useActionState } from "react";
import { trackOrder, type TrackState } from "@/app/order/actions";
import { Button, Field, Input, Notice } from "@/components/ui";

export function TrackForm() {
  const [state, action, pending] = useActionState<TrackState, FormData>(trackOrder, {});
  return (
    <form action={action} onSubmit={keepValues(action)} className="space-y-5">
      {state.error && <Notice tone="danger">{state.error}</Notice>}
      <Field name="orderNumber" label="Order number" hint="Looks like JSW-K7M2QXA">
        {(f) => <Input {...f} autoCapitalize="characters" autoComplete="off" />}
      </Field>
      <Field name="contact" label="Phone number or email you used" hint="The one you entered at checkout">
        {(f) => <Input {...f} autoComplete="off" />}
      </Field>
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Looking…" : "Find my order"}
      </Button>
    </form>
  );
}

"use client";

import { keepValues } from "@/lib/keep-form";
import { useActionState } from "react";
import { saveSettings, type SettingsState } from "@/app/admin/settings/actions";
import { Button, Card, CardBody, Field, Input, Notice } from "@/components/ui";
import type { BankDetails, OrderSettings } from "@/lib/settings";

export function SettingsForm({ bank, orders }: { bank: BankDetails; orders: OrderSettings }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettings, {});
  const e = state.errors ?? {};

  return (
    <form action={action} onSubmit={keepValues(action)} className="space-y-6">
      {state.saved && <Notice tone="positive">Settings saved.</Notice>}
      {Object.keys(e).length > 0 && <Notice tone="danger" title="Please fix the highlighted fields" />}

      <Card>
        <CardBody className="space-y-5">
          <div>
            <h2 className="text-title">Bank account for transfers</h2>
            <p className="mt-1 text-sm text-muted">Customers who pay by bank transfer are shown these details. Check every digit: money is sent exactly where this says.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field name="bankName" label="Bank" error={e.bankName}>
              {(f) => <Input {...f} defaultValue={bank.bankName} />}
            </Field>
            <Field name="accountNumber" label="Account number" error={e.accountNumber} hint="10 digits">
              {(f) => <Input {...f} inputMode="numeric" defaultValue={bank.accountNumber} />}
            </Field>
            <Field name="accountName" label="Account name" error={e.accountName} className="sm:col-span-2" hint="Exactly as the bank shows it">
              {(f) => <Input {...f} defaultValue={bank.accountName} />}
            </Field>
          </div>
          <Notice tone="warning">Every change to the bank account is recorded with your name and the time.</Notice>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-5">
          <div>
            <h2 className="text-title">Unpaid orders</h2>
            <p className="mt-1 text-sm text-muted">An order that is not paid keeps its items reserved for this long, then it is cancelled and the items go back on sale.</p>
          </div>
          <Field name="holdHours" label="Hold unpaid orders for (hours)" error={e.holdHours} hint="24 = one day, 48 = two days">
            {(f) => <Input {...f} inputMode="numeric" defaultValue={String(orders.holdHours)} className="max-w-40" />}
          </Field>
        </CardBody>
      </Card>

      <Button type="submit" variant="primary" size="lg" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}

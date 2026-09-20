"use client";

import { useActionState } from "react";
import { advanceOrder, confirmTransfer, reverifyOrder, type OrderActionState } from "@/app/admin/orders/actions";
import { Button, Field, Input, Notice, Select } from "@/components/ui";
import { STATUS_LABEL, type OrderStatus } from "@/lib/orders/rules";

function Result({ state }: { state: OrderActionState }) {
  if (state.error) return <Notice tone="danger">{state.error}</Notice>;
  if (state.message) return <Notice tone="positive">{state.message}</Notice>;
  return null;
}

export function OrderActions({
  orderId,
  next,
  transferWaiting,
  paystackOpen,
}: {
  orderId: string;
  next: OrderStatus[];
  transferWaiting: boolean;
  paystackOpen: boolean;
}) {
  const [confirmState, confirmAction, confirming] = useActionState<OrderActionState, FormData>(confirmTransfer, {});
  const [advState, advAction, advancing] = useActionState<OrderActionState, FormData>(advanceOrder, {});
  const [verifyState, verifyAction, verifying] = useActionState<OrderActionState, FormData>(reverifyOrder, {});

  return (
    <div className="space-y-6">
      {transferWaiting && (
        <form action={confirmAction} className="space-y-3 rounded-lg border border-solar-300 bg-solar-50 p-4">
          <input type="hidden" name="orderId" value={orderId} />
          <p className="font-medium text-strong">Bank transfer waiting for confirmation</p>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="funds" className="mt-0.5 size-5" />
            <span>I checked our bank account and this exact amount has arrived from this customer. (A receipt image can be faked; the bank app cannot.)</span>
          </label>
          <Button type="submit" variant="primary" disabled={confirming}>
            {confirming ? "Confirming…" : "Confirm payment received"}
          </Button>
          <Result state={confirmState} />
        </form>
      )}

      {paystackOpen && (
        <form action={verifyAction} className="space-y-3">
          <input type="hidden" name="orderId" value={orderId} />
          <Button type="submit" variant="outline" disabled={verifying}>
            {verifying ? "Checking…" : "Re-check Paystack payment"}
          </Button>
          <Result state={verifyState} />
        </form>
      )}

      {next.length > 0 && (
        <form action={advAction} className="space-y-3">
          <input type="hidden" name="orderId" value={orderId} />
          <div className="grid gap-3 sm:grid-cols-[14rem_1fr_auto] sm:items-end">
            <Field name="to" label="Move order to" required={false}>
              {(f) => (
                <Select {...f}>
                  {next.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field name="note" label="Note (optional)" required={false}>
              {(f) => <Input {...f} maxLength={300} placeholder="e.g. Driver: Musa, 0803…" />}
            </Field>
            <Button type="submit" variant="chassis" disabled={advancing}>
              Update
            </Button>
          </div>
          <Result state={advState} />
        </form>
      )}
    </div>
  );
}

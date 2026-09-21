"use client";

import { keepValues } from "@/lib/keep-form";
import { useActionState, useState } from "react";
import { bulkPrices, type PriceState } from "@/app/admin/products/prices/actions";
import { Button, Card, CardBody, Field, Input, Notice, Select } from "@/components/ui";
import { formatNaira } from "@/lib/site";

export function BulkPriceForm({ categories, brands }: { categories: { id: string; name: string }[]; brands: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<PriceState, FormData>(bulkPrices, {});
  const [confirmed, setConfirmed] = useState(false);
  const canApply = state.intent === "preview" && !state.fatal && (state.count ?? 0) > 0 && confirmed;

  return (
    <form action={action} onSubmit={keepValues(action)} className="space-y-5">
      <Card>
        <CardBody className="grid gap-5 sm:grid-cols-2">
          <Field name="categoryId" label="Category" required={false}>
            {(f) => (
              <Select {...f} defaultValue="">
                <option value="">Any category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field name="brandId" label="Brand" required={false}>
            {(f) => (
              <Select {...f} defaultValue="">
                <option value="">Any brand</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <label className="flex items-center gap-3 text-sm sm:col-span-2">
            <input type="checkbox" name="all" className="size-5" />
            All products (only tick this when you leave category and brand empty)
          </label>
          <Field name="mode" label="Change by">
            {(f) => (
              <Select {...f} defaultValue="percent">
                <option value="percent">A percentage</option>
                <option value="amount">A fixed amount in naira</option>
              </Select>
            )}
          </Field>
          <Field name="value" label="How much" hint="Use a minus sign to lower prices, e.g. -5 or -20000">
            {(f) => <Input {...f} inputMode="decimal" placeholder="e.g. 7.5" />}
          </Field>
          <Field name="round" label="Round to the nearest">
            {(f) => (
              <Select {...f} defaultValue="500">
                <option value="0">Do not round</option>
                <option value="100">₦100</option>
                <option value="500">₦500</option>
                <option value="1000">₦1,000</option>
              </Select>
            )}
          </Field>
          <label className="flex items-center gap-3 self-end pb-3 text-sm">
            <input type="checkbox" name="includeSale" defaultChecked className="size-5" />
            Change sale prices too
          </label>
        </CardBody>
      </Card>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" name="intent" value="preview" variant="chassis" disabled={pending}>
          {pending && state.intent !== "apply" ? "Working it out…" : "1. Preview"}
        </Button>
      </div>

      {state.fatal && <Notice tone="danger">{state.fatal}</Notice>}
      {state.applied && (
        <Notice tone="positive" title="Prices updated">
          {state.count} products changed. This is recorded in the audit log under your name.
        </Notice>
      )}

      {state.intent === "preview" && !state.fatal && state.sample && (
        <Card>
          <CardBody className="space-y-4">
            <p className="text-sm">
              <strong>{state.count}</strong> products would change{state.skipped ? `, ${state.skipped} skipped because the new price would be zero or below` : ""}.
            </p>
            {state.sample.length > 0 && (
              <ul className="space-y-1 text-sm">
                {state.sample.map((s) => (
                  <li key={s.name} className="flex justify-between gap-4">
                    <span>{s.name}</span>
                    <span className="numeric text-muted">
                      {formatNaira(s.before)} → <strong className="text-strong">{formatNaira(s.after)}</strong>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {(state.count ?? 0) > 0 && (
              <>
                <label className="flex items-start gap-3 text-sm">
                  <input type="checkbox" name="confirm" className="mt-0.5 size-5" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                  I have checked the preview and want to change these prices now.
                </label>
                <Button type="submit" name="intent" value="apply" variant="primary" disabled={pending || !canApply}>
                  2. Change prices
                </Button>
              </>
            )}
          </CardBody>
        </Card>
      )}
    </form>
  );
}

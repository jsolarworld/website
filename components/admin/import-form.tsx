"use client";

import { useActionState, useState } from "react";
import { importProducts, type ImportState } from "@/app/admin/products/import/actions";
import { Button, Card, CardBody, Notice, Textarea } from "@/components/ui";

export function ImportForm() {
  const [state, action, pending] = useActionState<ImportState, FormData>(importProducts, {});
  const [csv, setCsv] = useState("");
  // The Import button only unlocks for the exact text that was checked without errors.
  const [checked, setChecked] = useState<string | null>(null);

  const previewed = state.intent === "preview" && !state.fatal && (state.errors?.length ?? 0) === 0 && (state.created ?? 0) + (state.updated ?? 0) > 0;
  const canImport = previewed && checked === csv;

  return (
    <form
      action={(fd) => {
        if (fd.get("intent") === "preview") setChecked(String(fd.get("csv")));
        return action(fd);
      }}
      className="space-y-5"
    >
      <Card>
        <CardBody className="space-y-4">
          <label className="block text-sm font-medium text-strong">
            CSV file
            <input
              type="file"
              accept=".csv,text/csv"
              className="mt-2 block w-full text-sm"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setCsv(await f.text());
              }}
            />
          </label>
          <p className="text-xs text-muted">Or paste the file contents here. Prices are in whole naira.</p>
          <Textarea name="csv" rows={8} value={csv} onChange={(e) => setCsv(e.target.value)} className="font-mono text-xs" aria-label="CSV contents" />
        </CardBody>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" name="intent" value="preview" variant="chassis" disabled={pending || csv.trim() === ""}>
          {pending && state.intent !== "apply" ? "Checking…" : "1. Check the file"}
        </Button>
        <Button type="submit" name="intent" value="apply" variant="primary" disabled={pending || !canImport}>
          2. Import
        </Button>
      </div>

      {state.applied && (
        <Notice tone="positive" title="Import finished">
          {state.created} added, {state.updated} updated.
        </Notice>
      )}
      {state.fatal && <Notice tone="danger">{state.fatal}</Notice>}

      {state.intent && !state.applied && !state.fatal && (state.errors?.length ?? 0) === 0 && (
        <Notice tone="info" title="The file looks good">
          {state.created} to add, {state.updated} to update. Press Import to apply.
        </Notice>
      )}

      {state.errors && state.errors.length > 0 && (
        <Card>
          <CardBody>
            <h2 className="text-title">Problems to fix ({state.errors.length}{state.errors.length === 100 ? "+" : ""})</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {state.errors.map((e, i) => (
                <li key={i}>
                  <span className="numeric text-muted">Line {e.line}:</span> {e.message}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {state.sample && state.sample.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Will</th>
                <th className="px-4 py-2 font-medium">SKU</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 text-right font-medium">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {state.sample.map((r) => (
                <tr key={r.sku}>
                  <td className="px-4 py-2">{r.action === "create" ? "Add" : "Update"}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.sku}</td>
                  <td className="px-4 py-2">{r.name}</td>
                  <td className="numeric px-4 py-2 text-right">{r.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-2 text-xs text-muted">Showing the first {state.sample.length} rows.</p>
        </div>
      )}
    </form>
  );
}

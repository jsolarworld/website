"use client";

import { useMemo, useState } from "react";
import { Button, Input, Notice } from "@/components/ui";

export interface ComponentOption {
  id: string;
  name: string;
  sku: string | null;
}

export interface ComponentRow {
  componentId: string;
  quantity: number;
}

/** Package contents: pick existing products and quantities. Submits as JSON in a hidden `components` input. */
export function ComponentsField({ options, initial, error }: { options: ComponentOption[]; initial: ComponentRow[]; error?: string }) {
  const [rows, setRows] = useState<ComponentRow[]>(initial);
  const [query, setQuery] = useState("");
  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const taken = new Set(rows.map((r) => r.componentId));
    return options
      .filter((o) => !taken.has(o.id) && (o.name.toLowerCase().includes(q) || o.sku?.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [query, options, rows]);

  return (
    <div>
      <input type="hidden" name="components" value={JSON.stringify(rows)} />
      {error && <Notice tone="danger" className="mb-3">{error}</Notice>}

      {rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.componentId} className="flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-2">
              <span className="flex-1 text-sm">{byId.get(r.componentId)?.name ?? "Unknown item"}</span>
              <Input
                type="number"
                min={1}
                max={999}
                value={r.quantity}
                aria-label="Quantity"
                className="w-20"
                onChange={(e) =>
                  setRows((prev) => prev.map((p) => (p.componentId === r.componentId ? { ...p, quantity: Math.max(1, Math.min(999, Number(e.target.value) || 1)) } : p)))
                }
              />
              <Button variant="ghost" size="sm" onClick={() => setRows((prev) => prev.filter((p) => p.componentId !== r.componentId))}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3">
        <Input type="search" placeholder="Search a product to add (name or SKU)" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search products to add" />
        {matches.length > 0 && (
          <ul className="mt-2 divide-y divide-line rounded-md border border-line bg-surface">
            {matches.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-sunken"
                  onClick={() => {
                    setRows((prev) => [...prev, { componentId: o.id, quantity: 1 }]);
                    setQuery("");
                  }}
                >
                  {o.name} {o.sku && <span className="text-muted">· {o.sku}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

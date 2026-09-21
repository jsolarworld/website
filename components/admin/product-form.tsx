"use client";

import { keepValues } from "@/lib/keep-form";
import { useActionState, useState } from "react";
import { saveProduct, type FormState } from "@/app/admin/products/actions";
import { Button, Card, CardBody, Eyebrow, Field, Input, Notice, Select, Textarea } from "@/components/ui";
import { ComponentsField, type ComponentOption, type ComponentRow } from "./components-field";
import { MediaField, type MediaItem } from "./media-field";
import { NEW_BRAND, type SpecField } from "@/lib/admin/product-form";

export interface ProductFormInitial {
  id: string;
  kind: "PRODUCT" | "PACKAGE";
  name: string;
  slug: string;
  sku: string;
  description: string;
  categoryId: string;
  brandId: string;
  priceNgn: string;
  salePriceNgn: string;
  stock: string;
  lowStockThreshold: string;
  availableOnRequest: boolean;
  warranty: string;
  weightKg: string;
  datasheetUrl: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  featured: boolean;
  seoTitle: string;
  seoDescription: string;
  specs: Record<string, string | number>;
  media: MediaItem[];
  pkg: {
    chemistry: "LITHIUM" | "TUBULAR";
    inverterContinuousW: string;
    inverterSurgeW: string;
    batteryWh: string;
    arrayW: string;
    whatItCanPower: string;
    approved: boolean;
    components: ComponentRow[];
  };
}

interface Props {
  initial: ProductFormInitial;
  categories: { id: string; name: string; specTemplate: SpecField[] }[];
  brands: { id: string; name: string }[];
  componentOptions: ComponentOption[];
  canApprove: boolean;
  isEdit: boolean;
}

export function ProductForm({ initial, categories, brands, componentOptions, canApprove, isEdit }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveProduct, {});
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const [brandChoice, setBrandChoice] = useState(initial.brandId);
  // Controlled, so a failed save does not wipe what was typed (React resets uncontrolled fields after a form action).
  const [newBrand, setNewBrand] = useState("");
  const e = state.errors ?? {};
  const isPackage = initial.kind === "PACKAGE";
  const template = categories.find((c) => c.id === categoryId)?.specTemplate ?? [];

  return (
    <form action={action} onSubmit={keepValues(action)} className="space-y-8">
      <input type="hidden" name="id" value={initial.id} />
      <input type="hidden" name="kind" value={initial.kind} />

      {state.message && <Notice tone="danger">{state.message}</Notice>}
      {Object.keys(e).length > 0 && <Notice tone="danger" title="Please fix the highlighted fields" />}

      <Card>
        <CardBody className="grid gap-5 sm:grid-cols-2">
          <Field name="name" label="Name" error={e.name} className="sm:col-span-2" hint="e.g. Felicity 12kVA Hybrid Inverter 48V">
            {(f) => <Input {...f} defaultValue={initial.name} />}
          </Field>
          <Field name="categoryId" label="Category" error={e.categoryId}>
            {(f) => (
              <Select {...f} value={categoryId} onChange={(ev) => setCategoryId(ev.target.value)}>
                <option value="">Choose…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <div className="space-y-3">
            <Field name="brandId" label="Brand" required={false} error={e.brandId}>
              {(f) => (
                <Select {...f} value={brandChoice} onChange={(ev) => setBrandChoice(ev.target.value)}>
                  <option value="">No brand</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                  <option value={NEW_BRAND}>+ Add a new brand…</option>
                </Select>
              )}
            </Field>
            {brandChoice === NEW_BRAND && (
              <Field name="newBrand" label="New brand name" hint="It is saved, so you can pick it from the list next time">
                {(f) => <Input {...f} maxLength={60} autoFocus value={newBrand} onChange={(ev) => setNewBrand(ev.target.value)} />}
              </Field>
            )}
          </div>
          <Field name="sku" label="SKU" required={false} error={e.sku} hint="Your own product code">
            {(f) => <Input {...f} defaultValue={initial.sku} />}
          </Field>
          <Field name="slug" label="Web address" required={false} error={e.slug} hint={isEdit ? "Changing this keeps the old link working" : "Leave empty to make it from the name"}>
            {(f) => <Input {...f} defaultValue={initial.slug} />}
          </Field>
          <Field name="description" label="Description" required={false} className="sm:col-span-2">
            {(f) => <Textarea {...f} rows={4} defaultValue={initial.description} />}
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="grid gap-5 sm:grid-cols-2">
          <Field name="priceNgn" label="Price (naira)" error={e.priceNgn}>
            {(f) => <Input {...f} inputMode="numeric" defaultValue={initial.priceNgn} />}
          </Field>
          <Field name="salePriceNgn" label="Sale price (naira)" required={false} error={e.salePriceNgn} hint="Leave empty if not on sale">
            {(f) => <Input {...f} inputMode="numeric" defaultValue={initial.salePriceNgn} />}
          </Field>
          <Field name="stock" label="Stock (how many in the shop)" error={e.stock}>
            {(f) => <Input {...f} inputMode="numeric" defaultValue={initial.stock} />}
          </Field>
          <Field name="lowStockThreshold" label="Warn me when stock is at or below" required={false} error={e.lowStockThreshold}>
            {(f) => <Input {...f} inputMode="numeric" defaultValue={initial.lowStockThreshold} />}
          </Field>
          <label className="flex items-center gap-3 text-sm sm:col-span-2">
            <input type="checkbox" name="availableOnRequest" defaultChecked={initial.availableOnRequest} className="size-5" />
            Available on request (show this instead of a stock count)
          </label>
        </CardBody>
      </Card>

      {template.length > 0 && (
        <Card>
          <CardBody>
            <Eyebrow>Specifications</Eyebrow>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              {template.map((f) => (
                <Field key={`${categoryId}-${f.key}`} name={`spec.${f.key}`} label={f.unit ? `${f.label} (${f.unit})` : f.label} required={false} error={e[`spec.${f.key}`]}>
                  {(p) => <Input {...p} inputMode={f.unit ? "decimal" : "text"} defaultValue={String(initial.specs[f.key] ?? "")} />}
                </Field>
              ))}
            </div>
            {categories.find((c) => c.id === categoryId)?.name.toLowerCase().includes("inverter") && (
              <p className="mt-3 text-sm text-muted">
                &quot;Rated continuous power&quot; is the true output in watts, printed on the inverter label. It is not the same as the kVA number in the name.
              </p>
            )}
          </CardBody>
        </Card>
      )}

      {isPackage && (
        <Card>
          <CardBody className="space-y-5">
            <Eyebrow>Package sizing (used by the quote tool)</Eyebrow>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field name="pkg.chemistry" label="Battery type">
                {(f) => (
                  <Select {...f} defaultValue={initial.pkg.chemistry}>
                    <option value="LITHIUM">Lithium</option>
                    <option value="TUBULAR">Tubular</option>
                  </Select>
                )}
              </Field>
              <Field name="pkg.batteryWh" label="Battery capacity (Wh)" error={e["pkg.batteryWh"]} hint="10 kWh = 10000">
                {(f) => <Input {...f} inputMode="numeric" defaultValue={initial.pkg.batteryWh} />}
              </Field>
              <Field name="pkg.inverterContinuousW" label="Inverter continuous power (W)" error={e["pkg.inverterContinuousW"]}>
                {(f) => <Input {...f} inputMode="numeric" defaultValue={initial.pkg.inverterContinuousW} />}
              </Field>
              <Field name="pkg.inverterSurgeW" label="Inverter surge power (W)" error={e["pkg.inverterSurgeW"]}>
                {(f) => <Input {...f} inputMode="numeric" defaultValue={initial.pkg.inverterSurgeW} />}
              </Field>
              <Field name="pkg.arrayW" label="Solar panels total (W)" error={e["pkg.arrayW"]} hint="e.g. 3 panels of 550 W = 1650">
                {(f) => <Input {...f} inputMode="numeric" defaultValue={initial.pkg.arrayW} />}
              </Field>
              <Field name="pkg.whatItCanPower" label="What it can power" required={false} hint="e.g. 3-bedroom flat with fridge, TV, fans">
                {(f) => <Input {...f} defaultValue={initial.pkg.whatItCanPower} />}
              </Field>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-strong">What is in this package</p>
              <ComponentsField options={componentOptions} initial={initial.pkg.components} error={e.components} />
            </div>

            {canApprove ? (
              <label className="flex items-start gap-3 rounded-md bg-navy-50 p-3 text-sm">
                <input type="checkbox" name="pkg.approved" defaultChecked={initial.pkg.approved} className="mt-0.5 size-5" />
                <span>
                  <strong>Engineer approved.</strong> Only approved packages are ever recommended by the quote tool. Tick this only after an engineer has
                  checked that these parts work together.
                </span>
              </label>
            ) : (
              <Notice tone="info">Only the owner or store manager can approve a package. Editing sizing or contents withdraws an existing approval.</Notice>
            )}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody>
          <Eyebrow>Photos and videos</Eyebrow>
          <div className="mt-4">
            <MediaField initial={initial.media} error={e.media} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="grid gap-5 sm:grid-cols-2">
          <Field name="warranty" label="Warranty" required={false} hint="e.g. Up to 2 years">
            {(f) => <Input {...f} defaultValue={initial.warranty} />}
          </Field>
          <Field name="weightKg" label="Weight (kg)" required={false} error={e.weightKg}>
            {(f) => <Input {...f} inputMode="decimal" defaultValue={initial.weightKg} />}
          </Field>
          <Field name="datasheetUrl" label="Datasheet link" required={false} error={e.datasheetUrl} className="sm:col-span-2" hint="Must start with https://">
            {(f) => <Input {...f} defaultValue={initial.datasheetUrl} />}
          </Field>
          <Field name="seoTitle" label="Google title" required={false} hint="Leave empty to use the name">
            {(f) => <Input {...f} maxLength={70} defaultValue={initial.seoTitle} />}
          </Field>
          <Field name="seoDescription" label="Google description" required={false}>
            {(f) => <Input {...f} maxLength={170} defaultValue={initial.seoDescription} />}
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-wrap items-end gap-6">
          <Field name="status" label="Visibility" required={false}>
            {(f) => (
              <Select {...f} defaultValue={initial.status}>
                <option value="DRAFT">Draft (hidden)</option>
                <option value="PUBLISHED">Published (visible on the website)</option>
                <option value="ARCHIVED">Archived (hidden, kept for records)</option>
              </Select>
            )}
          </Field>
          <label className="flex items-center gap-3 pb-3 text-sm">
            <input type="checkbox" name="featured" defaultChecked={initial.featured} className="size-5" />
            Show on the home page
          </label>
        </CardBody>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" variant="primary" size="lg" disabled={pending}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create product"}
        </Button>
      </div>
    </form>
  );
}

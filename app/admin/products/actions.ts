"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AUDITED_PRODUCT_FIELDS, diffFields, logAudit } from "@/lib/admin/audit";
import { requireStaff } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { parseProductForm, type FormErrors, type SpecField } from "@/lib/admin/product-form";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";

export interface FormState {
  errors?: FormErrors;
  message?: string;
}

const sameComponents = (a: { componentId: string; quantity: number }[], b: { componentId: string; quantity: number }[]) =>
  a.length === b.length && a.every((x) => b.some((y) => y.componentId === x.componentId && y.quantity === x.quantity));

export async function saveProduct(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requireStaff("catalogue:write");
  const canApprove = can(staff.role, "packages:approve");

  const id = String(formData.get("id") ?? "");
  const existing = id
    ? await db.product.findUnique({ where: { id }, include: { media: true, packageSpec: true, components: true } })
    : null;
  if (id && !existing) return { message: "That product no longer exists." };
  // A product never turns into a package or back.
  if (existing) formData.set("kind", existing.kind);

  const category = await db.category.findUnique({ where: { id: String(formData.get("categoryId") ?? "") } });
  if (!category) return { errors: { categoryId: "Choose a category" } };

  const parsed = parseProductForm(formData, (category.specTemplate ?? []) as unknown as SpecField[]);
  if (!parsed.ok) return { errors: parsed.errors };
  const d = parsed.data;

  // Package components must be real, plain products (no packages inside packages, no self-reference).
  if (d.package) {
    const ids = d.package.components.map((c) => c.componentId);
    const found = await db.product.findMany({ where: { id: { in: ids }, kind: "PRODUCT" }, select: { id: true } });
    if (found.length !== ids.length || ids.includes(id)) {
      return { errors: { components: "Package contents can only be existing products" } };
    }
  }

  // A brand typed into the form: reuse it if it already exists (same name, any capitals), else create it,
  // so the next product can simply pick it from the list.
  if (d.newBrandName) {
    const slug = slugify(d.newBrandName);
    if (!slug) return { errors: { brandId: "Use letters or numbers in the brand name" } };
    let brand = await db.brand.findFirst({ where: { OR: [{ slug }, { name: { equals: d.newBrandName, mode: "insensitive" } }] } });
    if (!brand) {
      brand = await db.brand.create({ data: { slug, name: d.newBrandName } });
      await logAudit({ actorId: staff.id, action: "brand.create", entity: "Brand", entityId: brand.id, after: { name: brand.name } });
    }
    d.brandId = brand.id;
  }

  const productData = {
    kind: d.kind,
    name: d.name,
    slug: d.slug,
    sku: d.sku,
    description: d.description,
    categoryId: d.categoryId,
    brandId: d.brandId,
    priceNgn: d.priceNgn,
    salePriceNgn: d.salePriceNgn,
    stock: d.stock,
    lowStockThreshold: d.lowStockThreshold,
    availableOnRequest: d.availableOnRequest,
    warranty: d.warranty,
    weightKg: d.weightKg,
    datasheetUrl: d.datasheetUrl,
    status: d.status,
    featured: d.featured,
    seoTitle: d.seoTitle,
    seoDescription: d.seoDescription,
    specs: d.specs,
  };

  // Approval rules: only approvers can approve, and any change to a package's capacity or contents
  // withdraws its approval unless an approver saves it again.
  let approved = false;
  let approvalChanged = false;
  if (d.package) {
    const prev = existing?.packageSpec;
    const changedCapacity =
      !prev ||
      prev.chemistry !== d.package.chemistry ||
      prev.inverterContinuousW !== d.package.inverterContinuousW ||
      prev.inverterSurgeW !== d.package.inverterSurgeW ||
      prev.batteryWh !== d.package.batteryWh ||
      prev.arrayW !== d.package.arrayW ||
      !sameComponents(existing?.components ?? [], d.package.components);
    approved = canApprove ? d.package.approved : Boolean(prev?.approved) && !changedCapacity;
    approvalChanged = approved !== Boolean(prev?.approved);
  }

  let savedId: string;
  try {
    savedId = await db.$transaction(async (tx) => {
      const product = existing
        ? await tx.product.update({ where: { id: existing.id }, data: productData })
        : await tx.product.create({ data: productData });

      await tx.productMedia.deleteMany({ where: { productId: product.id } });
      if (d.media.length > 0) {
        await tx.productMedia.createMany({ data: d.media.map((m, i) => ({ productId: product.id, kind: m.kind, url: m.url, alt: m.alt, sortOrder: i })) });
      }

      if (d.package) {
        const spec = {
          chemistry: d.package.chemistry,
          inverterContinuousW: d.package.inverterContinuousW,
          inverterSurgeW: d.package.inverterSurgeW,
          batteryWh: d.package.batteryWh,
          arrayW: d.package.arrayW,
          whatItCanPower: d.package.whatItCanPower,
          approved,
          ...(approvalChanged ? (approved ? { approvedById: staff.id, approvedAt: new Date() } : { approvedById: null, approvedAt: null }) : {}),
        };
        await tx.packageSpec.upsert({ where: { productId: product.id }, create: { productId: product.id, ...spec }, update: spec });
        await tx.packageItem.deleteMany({ where: { packageId: product.id } });
        await tx.packageItem.createMany({ data: d.package.components.map((c) => ({ packageId: product.id, ...c })) });
      }

      // Slug changed: keep the old URL working (PRD SEO-03) and repoint any older redirects.
      if (existing && existing.slug !== d.slug) {
        const from = `/products/${existing.slug}`;
        const to = `/products/${d.slug}`;
        await tx.redirect.deleteMany({ where: { fromPath: to } });
        await tx.redirect.updateMany({ where: { toPath: from }, data: { toPath: to } });
        await tx.redirect.upsert({ where: { fromPath: from }, create: { fromPath: from, toPath: to }, update: { toPath: to } });
      }
      return product.id;
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      const target = String((e as { meta?: { target?: unknown } }).meta?.target ?? "");
      if (target.includes("sku")) return { errors: { sku: "Another product already uses this SKU" } };
      return { errors: { slug: "Another product already uses this web address. Change the slug." } };
    }
    console.error("saveProduct failed", e);
    return { message: "Could not save. Please try again." };
  }

  const audited = (p: Record<string, unknown>) => Object.fromEntries(AUDITED_PRODUCT_FIELDS.map((f) => [f, p[f]]));
  const diff = diffFields(existing ? audited(existing) : null, audited(productData), AUDITED_PRODUCT_FIELDS);
  if (diff.changed) {
    await logAudit({ actorId: staff.id, action: existing ? "product.update" : "product.create", entity: "Product", entityId: savedId, before: diff.before, after: diff.after });
  }
  if (d.package && approvalChanged) {
    await logAudit({ actorId: staff.id, action: approved ? "package.approve" : "package.unapprove", entity: "Product", entityId: savedId, after: { approved } });
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath(`/products/${d.slug}`);
  revalidatePath("/solar-quote");
  redirect(`/admin/products/${savedId}?saved=1`);
}

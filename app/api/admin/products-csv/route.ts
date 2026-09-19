import { NextResponse, type NextRequest } from "next/server";
import { requireStaff } from "@/lib/admin/guard";
import { csvCell } from "@/lib/csv";
import { db } from "@/lib/db";

const BASE_COLUMNS = ["sku", "name", "category", "brand", "price", "sale_price", "stock", "status", "warranty", "description", "featured", "available_on_request"];

/** Current catalogue as CSV (or a blank template), in exactly the shape the importer reads back. */
export async function GET(req: NextRequest) {
  await requireStaff("catalogue:read");
  const template = req.nextUrl.searchParams.get("template") === "1";

  const [categories, products] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    template
      ? Promise.resolve([])
      : db.product.findMany({ where: { kind: "PRODUCT" }, include: { category: true, brand: true }, orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }] }),
  ]);

  const specKeys = [...new Set(categories.flatMap((c) => ((c.specTemplate ?? []) as unknown as { key: string }[]).map((f) => f.key)))];
  const header = [...BASE_COLUMNS, ...specKeys.map((k) => `spec_${k.toLowerCase()}`)];
  const lines = [header.join(",")];

  if (template) {
    lines.push(["EXAMPLE-001", "Felicity 12kVA Hybrid Inverter 48V", categories[0]?.name ?? "Inverters", "Felicity", "1000000", "", "3", "draft", "Up to 2 years", "", "no", "no"].map(csvCell).join(","));
  }
  for (const p of products) {
    const specs = (p.specs ?? {}) as Record<string, string | number>;
    lines.push(
      [
        p.sku ?? "",
        p.name,
        p.category.name,
        p.brand?.name ?? "",
        p.priceNgn,
        p.salePriceNgn ?? "",
        p.stock,
        p.status.toLowerCase(),
        p.warranty ?? "",
        p.description ?? "",
        p.featured ? "yes" : "no",
        p.availableOnRequest ? "yes" : "no",
        ...specKeys.map((k) => specs[k] ?? ""),
      ]
        .map(csvCell)
        .join(","),
    );
  }

  return new NextResponse("﻿" + lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${template ? "products-template" : "products"}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

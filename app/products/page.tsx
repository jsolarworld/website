import type { Metadata } from "next";
import { Container, Section, SectionHeader } from "@/components/ui";
import { ProductListing, type ListingQuery } from "@/components/product-listing";
import { getBrands, getCategories } from "@/lib/catalogue";

export const metadata: Metadata = {
  title: "Solar products",
  description:
    "Inverters, lithium and tubular batteries, solar panels, street lights and accessories from J Solar World, Alaba International Market, Lagos.",
  alternates: { canonical: "/products" },
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<ListingQuery>;
}) {
  const [query, categories, brands] = await Promise.all([searchParams, getCategories(), getBrands()]);
  return (
    <Section tone="page" className="py-10 sm:py-14">
      <Container>
        <SectionHeader eyebrow="Store" title="Solar products" lead="Genuine equipment, priced in naira, delivered to all 36 states." />
        <div className="mt-8">
          <ProductListing basePath="/products" query={query} categories={categories} brands={brands} />
        </div>
      </Container>
    </Section>
  );
}

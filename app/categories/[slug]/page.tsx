import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container, Section, SectionHeader } from "@/components/ui";
import { ProductListing, type ListingQuery } from "@/components/product-listing";
import { getBrands, getCategories, getCategory } from "@/lib/catalogue";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<ListingQuery> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await getCategory((await params).slug);
  if (!category) return {};
  return {
    title: category.name,
    description: category.intro ?? `Shop ${category.name.toLowerCase()} from J Solar World, Alaba International Market, Lagos.`,
    alternates: { canonical: `/categories/${category.slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const [category, query, categories, brands] = await Promise.all([
    getCategory(slug),
    searchParams,
    getCategories(),
    getBrands(),
  ]);
  if (!category) notFound();

  return (
    <Section tone="page" className="py-10 sm:py-14">
      <Container>
        <SectionHeader eyebrow="Category" title={category.name} lead={category.intro ?? undefined} />
        <div className="mt-8">
          <ProductListing
            basePath={`/categories/${category.slug}`}
            query={query}
            categories={categories}
            brands={brands}
            lockedCategory={category.slug}
          />
        </div>
      </Container>
    </Section>
  );
}

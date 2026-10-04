import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogIndex } from "@/components/blog-index";
import { categoryLabel, isBlogCategory } from "@/lib/blog";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isBlogCategory(slug)) return {};
  return { title: `${categoryLabel(slug)}: solar guides`, alternates: { canonical: `/blog/category/${slug}` } };
}

export default async function BlogCategoryPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  if (!isBlogCategory(slug)) notFound();
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  return <BlogIndex category={slug} page={page} basePath={`/blog/category/${slug}`} />;
}

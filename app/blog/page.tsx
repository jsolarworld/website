import type { Metadata } from "next";
import { BlogIndex } from "@/components/blog-index";

export const metadata: Metadata = {
  title: "Solar guides and news",
  description: "Plain advice on choosing, paying for and looking after a solar system in Nigeria, from J Solar World, Alaba International Market, Lagos.",
  alternates: { canonical: "/blog" },
};

type Props = { searchParams: Promise<{ page?: string }> };

export default async function BlogPage({ searchParams }: Props) {
  const page = Math.max(1, Number.parseInt((await searchParams).page ?? "1", 10) || 1);
  return <BlogIndex page={page} basePath="/blog" />;
}

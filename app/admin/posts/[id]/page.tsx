import Link from "next/link";
import { notFound } from "next/navigation";
import { PostForm, type PostFormInitial } from "@/components/admin/post-form";
import { Container, Notice } from "@/components/ui";
import { requireStaff } from "@/lib/admin/guard";
import { db } from "@/lib/db";

export const metadata = { title: "Edit post" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> };

export default async function EditPostPage({ params, searchParams }: Props) {
  await requireStaff("content:write");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const isNew = id === "new";
  const post = isNew ? null : await db.post.findUnique({ where: { id } });
  if (!isNew && !post) notFound();

  const initial: PostFormInitial = {
    id: post?.id ?? "",
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    excerpt: post?.excerpt ?? "",
    body: post?.body ?? "",
    category: post?.category ?? "",
    media: post?.featuredImage ? [{ kind: "IMAGE", url: post.featuredImage, alt: post.featuredAlt ?? "" }] : [],
    status: post?.status ?? "DRAFT",
    seoTitle: post?.seoTitle ?? "",
    seoDescription: post?.seoDescription ?? "",
  };

  return (
    <Container className="max-w-3xl py-8">
      <Link href="/admin/posts" className="text-sm text-muted hover:text-strong">
        ← All posts
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-display-3">{isNew ? "New post" : post!.title}</h1>
        {post?.status === "PUBLISHED" && (
          <Link href={`/blog/${post.slug}`} className="text-sm text-navy-600 underline underline-offset-4" target="_blank">
            View on the website
          </Link>
        )}
      </div>
      {sp.saved && <Notice tone="positive" className="mt-6">Saved.</Notice>}
      <div className="mt-8">
        <PostForm initial={initial} isEdit={!isNew} />
      </div>
    </Container>
  );
}

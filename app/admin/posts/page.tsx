import Link from "next/link";
import { Badge, Container, EmptyState, buttonClass } from "@/components/ui";
import { requireStaff } from "@/lib/admin/guard";
import { categoryLabel } from "@/lib/blog";
import { db } from "@/lib/db";

export const metadata = { title: "Blog posts" };

const STATUS_TONE = { PUBLISHED: "positive", DRAFT: "neutral", ARCHIVED: "warning" } as const;
const dateFmt = new Intl.DateTimeFormat("en-NG", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Lagos" });

export default async function PostsPage() {
  await requireStaff("content:write");
  const posts = await db.post.findMany({ orderBy: { updatedAt: "desc" }, take: 200 });

  return (
    <Container className="py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-display-3">Blog posts</h1>
        <Link href="/admin/posts/new" className={buttonClass({ variant: "primary" })}>
          Write a post
        </Link>
      </div>

      {posts.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="No posts yet"
          description="Buying guides and price updates bring visitors from Google. Write the first one, save it as a draft, and publish when it has a photo and a summary."
        />
      ) : (
        <ul className="mt-6 divide-y divide-line rounded-lg border border-line bg-surface">
          {posts.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <Link href={`/admin/posts/${p.id}`} className="font-medium text-strong hover:underline">
                  {p.title}
                </Link>
                <p className="text-xs text-muted">
                  {[categoryLabel(p.category), p.publishedAt ? `published ${dateFmt.format(p.publishedAt)}` : null, `edited ${dateFmt.format(p.updatedAt)}`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <Badge tone={STATUS_TONE[p.status]}>{p.status.toLowerCase()}</Badge>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}

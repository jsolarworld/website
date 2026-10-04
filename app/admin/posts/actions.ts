"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAudit } from "@/lib/admin/audit";
import { requireStaff } from "@/lib/admin/guard";
import { parsePostForm } from "@/lib/blog";
import { db } from "@/lib/db";

export interface PostFormState {
  errors?: Record<string, string>;
  message?: string;
}

export async function savePost(_prev: PostFormState, formData: FormData): Promise<PostFormState> {
  const staff = await requireStaff("content:write");
  const id = String(formData.get("id") ?? "");
  const existing = id ? await db.post.findUnique({ where: { id } }) : null;
  if (id && !existing) return { message: "That post no longer exists." };

  const parsed = parsePostForm(formData);
  if (!parsed.ok) return { errors: parsed.errors };
  const d = parsed.data;

  const taken = await db.post.findFirst({ where: { slug: d.slug, NOT: id ? { id } : undefined }, select: { id: true } });
  if (taken) return { errors: { slug: "Another post already uses this web address" } };

  // The publish date is set the first time a post goes live and kept after that, so edits don't re-date it.
  const publishedAt = d.status === "PUBLISHED" ? (existing?.publishedAt ?? new Date()) : (existing?.publishedAt ?? null);

  let savedId = id;
  try {
    if (existing) {
      await db.$transaction(async (tx) => {
        await tx.post.update({ where: { id }, data: { ...d, publishedAt } });
        // A live post that moves keeps its old link working (the post page follows Redirect rows).
        if (existing.slug !== d.slug && existing.publishedAt) {
          await tx.redirect.upsert({
            where: { fromPath: `/blog/${existing.slug}` },
            update: { toPath: `/blog/${d.slug}` },
            create: { fromPath: `/blog/${existing.slug}`, toPath: `/blog/${d.slug}` },
          });
        }
      });
    } else {
      savedId = (await db.post.create({ data: { ...d, publishedAt, authorId: staff.id }, select: { id: true } })).id;
    }
  } catch (e) {
    console.error("savePost failed", e);
    return { message: "The post could not be saved. Please try again." };
  }

  if (!existing || existing.status !== d.status) {
    await logAudit({ actorId: staff.id, action: existing ? "post.status" : "post.create", entity: "Post", entityId: savedId, before: existing ? { status: existing.status } : undefined, after: { status: d.status, title: d.title } });
  }
  revalidatePath("/blog", "layout");
  revalidatePath("/admin/posts");
  redirect(`/admin/posts/${savedId}?saved=1`);
}

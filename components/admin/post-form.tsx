"use client";

import { keepValues } from "@/lib/keep-form";
import { useActionState } from "react";
import { savePost, type PostFormState } from "@/app/admin/posts/actions";
import { Button, Card, CardBody, Eyebrow, Field, Input, Notice, Select, Textarea } from "@/components/ui";
import { BLOG_CATEGORIES } from "@/lib/blog";
import { MediaField, type MediaItem } from "./media-field";

export interface PostFormInitial {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  category: string;
  media: MediaItem[];
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  seoTitle: string;
  seoDescription: string;
}

export function PostForm({ initial, isEdit }: { initial: PostFormInitial; isEdit: boolean }) {
  const [state, action, pending] = useActionState<PostFormState, FormData>(savePost, {});
  const e = state.errors ?? {};

  return (
    <form action={action} onSubmit={keepValues(action)} className="space-y-8">
      <input type="hidden" name="id" value={initial.id} />
      {state.message && <Notice tone="danger">{state.message}</Notice>}
      {Object.keys(e).length > 0 && <Notice tone="danger" title="Please fix the highlighted fields" />}

      <Card>
        <CardBody className="grid gap-5 sm:grid-cols-2">
          <Field name="title" label="Title" error={e.title} className="sm:col-span-2" hint="e.g. How big an inverter do I need for a 3-bedroom flat?">
            {(f) => <Input {...f} maxLength={140} defaultValue={initial.title} />}
          </Field>
          <Field name="category" label="Category" required={false} error={e.category}>
            {(f) => (
              <Select {...f} defaultValue={initial.category}>
                <option value="">None</option>
                {BLOG_CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field name="slug" label="Web address" required={false} error={e.slug} hint={isEdit ? "Changing this keeps the old link working" : "Leave empty to make it from the title"}>
            {(f) => <Input {...f} defaultValue={initial.slug} />}
          </Field>
          <Field name="excerpt" label="Summary" required={false} error={e.excerpt} className="sm:col-span-2" hint="One or two sentences, shown in the blog list. Needed to publish.">
            {(f) => <Textarea {...f} rows={2} maxLength={300} defaultValue={initial.excerpt} />}
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Field
            name="body"
            label="Article"
            error={e.body}
            hint={'Leave an empty line between paragraphs. Start a line with "## " for a heading and "- " for a list item.'}
          >
            {(f) => <Textarea {...f} rows={18} defaultValue={initial.body} className="font-mono text-sm" />}
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Eyebrow>Photo</Eyebrow>
          <p className="mt-1 text-sm text-muted">One photo, shown at the top of the article and in the blog list. Needed to publish.</p>
          <div className="mt-4">
            <MediaField initial={initial.media} error={e.media} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="grid gap-5 sm:grid-cols-2">
          <Field name="seoTitle" label="Google title" required={false} hint="Leave empty to use the title">
            {(f) => <Input {...f} maxLength={70} defaultValue={initial.seoTitle} />}
          </Field>
          <Field name="seoDescription" label="Google description" required={false} hint="Leave empty to use the summary">
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
                <option value="PUBLISHED">Published (on the website)</option>
                <option value="ARCHIVED">Archived (hidden, kept)</option>
              </Select>
            )}
          </Field>
          <Button type="submit" variant="primary" size="lg" disabled={pending}>
            {pending ? "Saving…" : isEdit ? "Save changes" : "Create post"}
          </Button>
        </CardBody>
      </Card>
    </form>
  );
}

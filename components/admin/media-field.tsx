"use client";

import Image from "next/image";
import { useState } from "react";
import { Button, Input, Notice } from "@/components/ui";
import { MAX_IMAGE_BYTES, MAX_MEDIA, MAX_VIDEO_BYTES, kindOfFile, videoPoster, type MediaItem } from "@/lib/media";

export type { MediaItem };

const mb = (bytes: number) => `${Math.round(bytes / (1024 * 1024))} MB`;

/** Photo and video list backed by signed Cloudinary uploads. Submits as JSON in a hidden `media` input. */
export function MediaField({ initial, error }: { initial: MediaItem[]; error?: string }) {
  const [items, setItems] = useState<MediaItem[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setProblem(null);
    const added: MediaItem[] = [];
    try {
      for (const file of Array.from(files)) {
        if (items.length + added.length >= MAX_MEDIA) throw new Error(`A product can have up to ${MAX_MEDIA} photos and videos`);
        const kind = kindOfFile(file);
        if (!kind) throw new Error(`${file.name} is not a JPG, PNG, WebP, MP4, MOV or WebM file`);
        const limit = kind === "VIDEO" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
        if (file.size > limit) throw new Error(`${file.name} is over ${mb(limit)}`);

        setBusy(kind === "VIDEO" ? `Uploading ${file.name}… videos take a little longer` : `Uploading ${file.name}…`);
        // A fresh signature per file: they expire quickly.
        const sigRes = await fetch("/api/admin/cloudinary-sign", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ kind }),
        });
        if (!sigRes.ok) throw new Error("Could not start the upload. Sign in again and retry.");
        const sig = await sigRes.json();

        const body = new FormData();
        body.set("file", file);
        body.set("api_key", sig.apiKey);
        body.set("timestamp", String(sig.timestamp));
        body.set("signature", sig.signature);
        body.set("folder", sig.folder);
        body.set("allowed_formats", sig.allowed_formats);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/${sig.resourceType}/upload`, { method: "POST", body });
        const json = await res.json();
        if (!res.ok || !json.secure_url) throw new Error(json?.error?.message ?? `Upload of ${file.name} failed`);
        added.push({ kind, url: json.secure_url, alt: "" });
      }
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Upload failed");
    } finally {
      // Keep whatever finished before a failure, so a big batch is not lost to one bad file.
      if (added.length > 0) setItems((prev) => [...prev, ...added]);
      setBusy(null);
    }
  }

  const move = (i: number, d: -1 | 1) =>
    setItems((prev) => {
      const j = i + d;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <div>
      <input type="hidden" name="media" value={JSON.stringify(items)} />
      {(error || problem) && <Notice tone="danger" className="mb-3">{error ?? problem}</Notice>}

      {items.length > 0 && (
        <ul className="space-y-3">
          {items.map((m, i) => (
            <li key={m.url} className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-surface p-3">
              <div className="relative size-16 shrink-0 overflow-hidden rounded bg-sunken">
                <Image src={m.kind === "VIDEO" ? videoPoster(m.url) : m.url} alt={m.alt || "New upload"} fill sizes="64px" className="object-contain" />
                {m.kind === "VIDEO" && (
                  <span aria-hidden className="absolute inset-0 grid place-items-center bg-chassis/40 text-lg text-white">▶</span>
                )}
              </div>
              <div className="min-w-48 flex-1">
                <Input
                  aria-label={`${m.kind === "VIDEO" ? "Video" : "Photo"} ${i + 1} description`}
                  placeholder={
                    m.kind === "VIDEO"
                      ? "What the video shows, e.g. Unboxing the 10 kWh battery"
                      : i === 0
                        ? "Main photo: what it shows, e.g. Front view of the inverter"
                        : "What this photo shows"
                  }
                  value={m.alt}
                  onChange={(e) => setItems((prev) => prev.map((p, j) => (j === i ? { ...p, alt: e.target.value } : p)))}
                />
                <p className="mt-1 text-xs text-muted">{m.kind === "VIDEO" ? "Video" : i === 0 ? "Photo · the main one" : "Photo"}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move earlier">
                  ↑
                </Button>
                <Button variant="ghost" size="sm" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move later">
                  ↓
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}>
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <label className="mt-3 inline-flex">
        <span className="inline-flex h-11 cursor-pointer items-center rounded-md border border-line-strong bg-surface px-5 text-sm font-semibold hover:border-navy-600">
          {busy ? "Uploading…" : "Add photos or videos"}
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
          multiple
          className="sr-only"
          disabled={busy !== null}
          onChange={(e) => {
            void upload(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      {busy && <p role="status" className="mt-2 text-sm text-muted">{busy}</p>}
      <p className="mt-2 text-xs text-muted">
        Photos: JPG, PNG or WebP up to {mb(MAX_IMAGE_BYTES)}. Videos: MP4, MOV or WebM up to {mb(MAX_VIDEO_BYTES)}. The first photo is the main one. Describe each
        item briefly (it helps Google and blind visitors).
      </p>
    </div>
  );
}

"use client";

import Image from "next/image";
import { useState } from "react";
import { Button, Input, Notice } from "@/components/ui";

export interface ImageItem {
  url: string;
  alt: string;
}

/** Photo list backed by signed Cloudinary uploads. Submits as JSON in a hidden `images` input. */
export function ImagesField({ initial, error }: { initial: ImageItem[]; error?: string }) {
  const [images, setImages] = useState<ImageItem[]>(initial);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setProblem(null);
    try {
      const added: ImageItem[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 8 * 1024 * 1024) throw new Error(`${file.name} is over 8 MB`);
        // A fresh signature per file: they expire quickly.
        const sigRes = await fetch("/api/admin/cloudinary-sign", { method: "POST" });
        if (!sigRes.ok) throw new Error("Could not start the upload. Sign in again and retry.");
        const sig = await sigRes.json();

        const body = new FormData();
        body.set("file", file);
        body.set("api_key", sig.apiKey);
        body.set("timestamp", String(sig.timestamp));
        body.set("signature", sig.signature);
        body.set("folder", sig.folder);
        body.set("allowed_formats", sig.allowed_formats);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: "POST", body });
        const json = await res.json();
        if (!res.ok || !json.secure_url) throw new Error(json?.error?.message ?? `Upload of ${file.name} failed`);
        added.push({ url: json.secure_url, alt: "" });
      }
      setImages((prev) => [...prev, ...added]);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  const move = (i: number, d: -1 | 1) =>
    setImages((prev) => {
      const j = i + d;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <div>
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      {(error || problem) && <Notice tone="danger" className="mb-3">{error ?? problem}</Notice>}

      {images.length > 0 && (
        <ul className="space-y-3">
          {images.map((img, i) => (
            <li key={img.url} className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-surface p-3">
              <div className="relative size-16 shrink-0 overflow-hidden rounded bg-sunken">
                <Image src={img.url} alt={img.alt || "New photo"} fill sizes="64px" className="object-contain" />
              </div>
              <div className="min-w-[12rem] flex-1">
                <Input
                  aria-label={`Photo ${i + 1} description`}
                  placeholder={i === 0 ? "Main photo: what it shows, e.g. Front view of the inverter" : "What this photo shows"}
                  value={img.alt}
                  onChange={(e) => setImages((prev) => prev.map((p, j) => (j === i ? { ...p, alt: e.target.value } : p)))}
                />
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move earlier">
                  ↑
                </Button>
                <Button variant="ghost" size="sm" onClick={() => move(i, 1)} disabled={i === images.length - 1} aria-label="Move later">
                  ↓
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}>
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <label className="mt-3 inline-flex">
        <span className="inline-flex h-11 cursor-pointer items-center rounded-md border border-line-strong bg-surface px-5 text-sm font-semibold hover:border-navy-600">
          {busy ? "Uploading…" : "Add photos"}
        </span>
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={busy} onChange={(e) => upload(e.target.files)} />
      </label>
      <p className="mt-2 text-xs text-muted">JPG, PNG or WebP up to 8 MB. The first photo is the main one. Describe each photo briefly (it helps Google and blind visitors).</p>
    </div>
  );
}

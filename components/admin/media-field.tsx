"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Notice } from "@/components/ui";
import { cn } from "@/lib/cn";
import { MAX_IMAGE_BYTES, MAX_MEDIA, MAX_VIDEO_BYTES, kindOfFile, videoPoster, type MediaItem, type MediaKind } from "@/lib/media";

export type { MediaItem };

const mb = (bytes: number) => `${Math.round(bytes / (1024 * 1024))} MB`;
/** Uploads that run at once. Two keeps a phone connection usable while a batch goes up. */
const PARALLEL = 2;

interface Upload {
  id: number;
  name: string;
  kind: MediaKind;
  /** 0 to 100. */
  progress: number;
  error?: string;
}

interface Signature {
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  allowed_formats: string;
  cloudName: string;
  resourceType: "image" | "video";
}

/** Browser upload straight to Cloudinary, with progress (fetch cannot report upload progress). */
function sendToCloudinary(file: File, sig: Signature, onProgress: (percent: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const body = new FormData();
    body.set("file", file);
    body.set("api_key", sig.apiKey);
    body.set("timestamp", String(sig.timestamp));
    body.set("signature", sig.signature);
    body.set("folder", sig.folder);
    body.set("allowed_formats", sig.allowed_formats);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${sig.cloudName}/${sig.resourceType}/upload`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onerror = () => reject(new Error("The connection dropped. Check your internet and try again."));
    xhr.onload = () => {
      let json: { secure_url?: string; error?: { message?: string } } = {};
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        /* fall through to the error below */
      }
      if (xhr.status >= 200 && xhr.status < 300 && json.secure_url) resolve(json.secure_url);
      else reject(new Error(json.error?.message ?? "The upload was refused."));
    };
    xhr.send(body);
  });
}

const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-8" aria-hidden>
    <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" />
    <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </svg>
);

/**
 * Photo and video uploader: drag and drop or browse, live progress, thumbnail grid with reordering
 * and a required description on every item. Submits as JSON in a hidden `media` input.
 */
export function MediaField({ initial, error }: { initial: MediaItem[]; error?: string }) {
  const [items, setItems] = useState<MediaItem[]>(initial);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const nextId = useRef(1);
  const guard = useRef<HTMLInputElement>(null);
  const uploading = uploads.some((u) => !u.error);

  // While a file is still going up, block "Save" with a clear message instead of saving without it.
  useEffect(() => {
    guard.current?.setCustomValidity(uploading ? "Wait for the uploads to finish, then save." : "");
  }, [uploading]);

  const patch = (id: number, change: Partial<Upload>) => setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...change } : u)));

  async function uploadOne(file: File, kind: MediaKind, id: number) {
    try {
      // A fresh signature per file: they expire quickly.
      const sigRes = await fetch("/api/admin/cloudinary-sign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      if (!sigRes.ok) throw new Error("Could not start the upload. Sign in again and retry.");
      const url = await sendToCloudinary(file, (await sigRes.json()) as Signature, (progress) => patch(id, { progress }));
      setItems((prev) => [...prev, { kind, url, alt: "" }]);
      setUploads((prev) => prev.filter((u) => u.id !== id));
    } catch (e) {
      patch(id, { error: e instanceof Error ? e.message : "Upload failed" });
    }
  }

  function addFiles(list: FileList | File[] | null) {
    const files = Array.from(list ?? []);
    if (files.length === 0) return;
    setProblem(null);

    const accepted: { file: File; kind: MediaKind; id: number }[] = [];
    const rejected: string[] = [];
    let room = MAX_MEDIA - items.length - uploads.filter((u) => !u.error).length;
    for (const file of files) {
      const kind = kindOfFile(file);
      const limit = kind === "VIDEO" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
      if (!kind) rejected.push(`${file.name} is not a JPG, PNG, WebP, MP4, MOV or WebM file`);
      else if (file.size > limit) rejected.push(`${file.name} is over ${mb(limit)}`);
      else if (room <= 0) rejected.push(`${file.name} was skipped: a product can have up to ${MAX_MEDIA} photos and videos`);
      else {
        room -= 1;
        accepted.push({ file, kind, id: nextId.current++ });
      }
    }
    if (rejected.length > 0) setProblem(rejected.join(". ") + ".");
    if (accepted.length === 0) return;

    setUploads((prev) => [...prev, ...accepted.map(({ file, kind, id }) => ({ id, name: file.name, kind, progress: 0 }))]);
    // A small pool: PARALLEL workers pull from the same queue.
    const queue = [...accepted];
    const worker = async () => {
      for (let job = queue.shift(); job; job = queue.shift()) await uploadOne(job.file, job.kind, job.id);
    };
    void Promise.all(Array.from({ length: Math.min(PARALLEL, queue.length) }, worker));
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
    <div className="space-y-4">
      <input type="hidden" name="media" value={JSON.stringify(items)} />
      {/* Invisible; only makes the browser refuse to submit while an upload is running. */}
      {uploading && <input ref={guard} required defaultValue="" tabIndex={-1} aria-hidden className="pointer-events-none absolute size-px opacity-0" />}
      {(error || problem) && <Notice tone="danger">{error ?? problem}</Notice>}

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors",
          "focus-within:border-navy-600 focus-within:ring-2 focus-within:ring-navy-600/30",
          dragging ? "border-navy-600 bg-navy-50" : "border-line-strong bg-sunken hover:border-navy-600 hover:bg-navy-50",
        )}
      >
        <span className="text-navy-600">
          <UploadIcon />
        </span>
        <span className="font-display text-base font-semibold text-strong">{dragging ? "Drop to upload" : "Drag photos and videos here"}</span>
        <span className="text-sm text-muted">
          or <span className="font-semibold text-navy-700 underline underline-offset-4">choose from your phone or computer</span>
        </span>
        <span className="text-xs text-subtle">
          Photos: JPG, PNG, WebP up to {mb(MAX_IMAGE_BYTES)} · Videos: MP4, MOV, WebM up to {mb(MAX_VIDEO_BYTES)}
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
          multiple
          className="sr-only"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {uploads.length > 0 && (
        <ul className="space-y-2" aria-live="polite">
          {uploads.map((u) => (
            <li key={u.id} className={cn("rounded-md border p-3", u.error ? "border-alert-100 bg-alert-50" : "border-line bg-surface")}>
              <div className="flex items-center justify-between gap-3">
                {/* min-w-0 + truncate: a long camera or WhatsApp file name must not push the layout wider. */}
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-strong" title={u.name}>
                  {u.kind === "VIDEO" ? "Video" : "Photo"} · {u.name}
                </p>
                {u.error ? (
                  <button type="button" onClick={() => setUploads((prev) => prev.filter((x) => x.id !== u.id))} className="shrink-0 text-sm font-semibold text-alert-700 underline">
                    Dismiss
                  </button>
                ) : (
                  <span className="numeric shrink-0 text-sm text-muted">{u.progress < 100 ? `${u.progress}%` : "Processing…"}</span>
                )}
              </div>
              {u.error ? (
                <p className="mt-1 text-sm text-alert-700">{u.error}</p>
              ) : (
                <div
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-sunken"
                  role="progressbar"
                  aria-valuenow={u.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Uploading ${u.name}`}
                >
                  <div className={cn("h-full rounded-full bg-accent transition-[width] duration-200", u.progress >= 100 && "animate-pulse")} style={{ width: `${u.progress}%` }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((m, i) => (
            <li key={m.url} className="overflow-hidden rounded-lg border border-line bg-surface">
              <div className="relative aspect-[4/3] bg-sunken">
                <Image src={m.kind === "VIDEO" ? videoPoster(m.url) : m.url} alt={m.alt || "New upload"} fill sizes="(min-width: 640px) 30vw, 90vw" className="object-contain" />
                {m.kind === "VIDEO" && (
                  <span aria-hidden className="absolute inset-0 grid place-items-center">
                    <span className="grid size-12 place-items-center rounded-full bg-chassis/75 text-lg text-white">▶</span>
                  </span>
                )}
                <span className="absolute left-2 top-2 rounded-sm bg-chassis/85 px-2 py-0.5 text-xs font-semibold text-white">
                  {i === 0 ? "Main · " : ""}
                  {m.kind === "VIDEO" ? "Video" : "Photo"}
                </span>
                <div className="absolute right-2 top-2 flex gap-1">
                  <IconButton label="Move earlier" disabled={i === 0} onClick={() => move(i, -1)}>
                    ←
                  </IconButton>
                  <IconButton label="Move later" disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                    →
                  </IconButton>
                  <IconButton label="Remove" tone="danger" onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}>
                    ✕
                  </IconButton>
                </div>
              </div>
              <div className="p-3">
                <input
                  aria-label={`${m.kind === "VIDEO" ? "Video" : "Photo"} ${i + 1} description`}
                  className={cn(
                    "h-10 w-full rounded-md border bg-surface px-3 text-sm text-strong outline-none placeholder:text-subtle",
                    "focus:border-navy-600 focus:ring-2 focus:ring-navy-600/25",
                    m.alt.trim() === "" ? "border-ember-300" : "border-line-strong",
                  )}
                  placeholder={
                    m.kind === "VIDEO" ? "What the video shows, e.g. Unboxing the inverter" : i === 0 ? "Main photo, e.g. Front view of the inverter" : "What this photo shows"
                  }
                  value={m.alt}
                  onChange={(e) => setItems((prev) => prev.map((p, j) => (j === i ? { ...p, alt: e.target.value } : p)))}
                />
                {m.alt.trim() === "" && <p className="mt-1 text-xs text-ember-700">A short description is needed before you can save.</p>}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted">The first photo is the main one. The description helps Google and blind visitors.</p>
    </div>
  );
}

function IconButton({ label, tone, disabled, onClick, children }: { label: string; tone?: "danger"; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid size-8 place-items-center rounded-md bg-surface/90 text-sm font-semibold shadow-xs ring-1 ring-line transition-colors",
        "hover:bg-surface disabled:pointer-events-none disabled:opacity-40",
        tone === "danger" ? "text-alert-700 hover:ring-alert-500" : "text-strong hover:ring-navy-600",
      )}
    >
      {children}
    </button>
  );
}

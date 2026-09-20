"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Notice } from "@/components/ui";

export function ProofUpload({ orderNumber, token, alreadyUploaded }: { orderNumber: string; token: string; alreadyUploaded: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(alreadyUploaded);

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    const body = new FormData();
    body.set("file", file);
    body.set("orderNumber", orderNumber);
    body.set("token", token);
    try {
      const res = await fetch("/api/order/proof", { method: "POST", body });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "The upload failed. Please try again.");
      setDone(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {error && <Notice tone="danger">{error}</Notice>}
      {done && <Notice tone="positive">We have your receipt. Our team will confirm the payment in our bank account, usually within a few hours.</Notice>}
      <label className="inline-flex">
        <span className="inline-flex h-11 cursor-pointer items-center rounded-md border border-line-strong bg-surface px-5 text-sm font-semibold hover:border-navy-600">
          {busy ? "Uploading…" : done ? "Upload a different receipt" : "Upload your transfer receipt"}
        </span>
        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={(e) => upload(e.target.files?.[0])} />
      </label>
    </div>
  );
}

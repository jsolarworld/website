"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, Input, Notice } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

const MIN = 10;

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < MIN) return setError(`Use at least ${MIN} characters.`);
    if (password !== confirm) return setError("The two passwords are not the same.");
    setBusy(true);
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    setBusy(false);
    if (error) return setError("This link has expired or was already used. Ask for a new one.");
    router.push("/admin/login?reset=1");
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && (
        <Notice tone="danger">
          {error} <Link href="/admin/forgot-password" className="underline">Send a new link</Link>
        </Notice>
      )}
      <Field name="password" label="New password" hint={`At least ${MIN} characters`}>
        {(f) => <Input {...f} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
      </Field>
      <Field name="confirm" label="New password again">
        {(f) => <Input {...f} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />}
      </Field>
      <Button type="submit" variant="primary" block disabled={busy}>
        {busy ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}

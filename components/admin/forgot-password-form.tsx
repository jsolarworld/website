"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Field, Input, Notice } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await authClient.requestPasswordReset({ email: email.trim(), redirectTo: "/admin/reset-password" });
    setBusy(false);
    if (error) return setError("Something went wrong. Try again in a minute.");
    setDone(true);
  }

  if (done) {
    // The same message whether or not the address has an account, so this page can't be used to find out who works here.
    return (
      <div className="space-y-4">
        <Notice tone="info" title="Check your email">
          If that address belongs to a staff account, we have sent a link to choose a new password. It works once and expires in one hour.
        </Notice>
        <p className="text-sm text-muted">
          No email? Ask an owner to reset your sign-in from the Staff page.{" "}
          <Link href="/admin/login" className="underline">Back to sign in</Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && <Notice tone="danger">{error}</Notice>}
      <Field name="email" label="Your staff email">
        {(f) => <Input {...f} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />}
      </Field>
      <Button type="submit" variant="primary" block disabled={busy}>
        {busy ? "Sending…" : "Send reset link"}
      </Button>
      <p className="text-center text-sm">
        <Link href="/admin/login" className="text-muted underline">Back to sign in</Link>
      </p>
    </form>
  );
}

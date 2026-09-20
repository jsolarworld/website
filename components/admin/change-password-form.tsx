"use client";

import { useState } from "react";
import { Button, Card, CardBody, Field, Input, Notice } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

const MIN = 10;

export function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (next.length < MIN) return setError(`The new password needs at least ${MIN} characters.`);
    if (next !== again) return setError("The two new passwords do not match.");
    if (next === current) return setError("Choose a password different from the current one.");
    setBusy(true);
    // revokeOtherSessions: anyone else signed in with the old password is signed out.
    const { error } = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true });
    setBusy(false);
    if (error) return setError("The current password is not right.");
    setCurrent("");
    setNext("");
    setAgain("");
    setDone(true);
  }

  return (
    <Card>
      <CardBody>
        <h2 className="text-title">Change your password</h2>
        <form onSubmit={submit} className="mt-4 space-y-4">
          {error && <Notice tone="danger">{error}</Notice>}
          {done && <Notice tone="positive">Password changed. Other devices have been signed out.</Notice>}
          <Field name="current" label="Current password">
            {(f) => <Input {...f} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />}
          </Field>
          <Field name="next" label="New password" hint={`At least ${MIN} characters. A few words together is easy to remember and hard to guess.`}>
            {(f) => <Input {...f} type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />}
          </Field>
          <Field name="again" label="New password again">
            {(f) => <Input {...f} type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} />}
          </Field>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? "Saving…" : "Change password"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

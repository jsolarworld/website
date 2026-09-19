"use client";

import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { Button, Card, CardBody, Field, Input, Notice } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

export function SecurityPanel({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [totpURI, setTotpURI] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data, error } = await authClient.twoFactor.enable({ password });
    setBusy(false);
    if (error || !data || !("totpURI" in data)) return setError("Wrong password.");
    setTotpURI(data.totpURI);
    setBackupCodes(data.backupCodes);
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await authClient.twoFactor.verifyTotp({ code: code.replace(/\s/g, "") });
    setBusy(false);
    if (error) return setError("That code is not right. Try the newest one.");
    router.push("/admin");
    router.refresh();
  }

  async function disable(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await authClient.twoFactor.disable({ password });
    setBusy(false);
    if (error) return setError("Wrong password.");
    router.refresh();
  }

  if (totpURI) {
    return (
      <Card>
        <CardBody className="space-y-6">
          {error && <Notice tone="danger">{error}</Notice>}
          <div>
            <h2 className="text-title">1. Scan this with your authenticator app</h2>
            <div className="mt-4 inline-block rounded-lg border border-line bg-white p-3">
              <QRCodeSVG value={totpURI} size={176} />
            </div>
          </div>
          {backupCodes && (
            <div>
              <h2 className="text-title">2. Save these backup codes</h2>
              <p className="mt-1 text-sm text-muted">Each works once if you lose your phone. They will not be shown again.</p>
              <ul className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm">
                {backupCodes.map((c) => (
                  <li key={c} className="rounded-md bg-sunken px-3 py-2">
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <form onSubmit={confirm}>
            <h2 className="text-title">3. Enter the 6-digit code to finish</h2>
            <div className="mt-3 flex items-end gap-3">
              <Field name="code" label="Code" className="flex-1">
                {(f) => <Input {...f} inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />}
              </Field>
              <Button type="submit" variant="primary" disabled={busy}>
                {busy ? "Checking…" : "Turn on"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody>
        {error && <Notice tone="danger" className="mb-4">{error}</Notice>}
        <form onSubmit={enabled ? disable : start} className="space-y-4">
          <p className="text-sm">
            {enabled ? "Two-step sign-in is ON for your account." : "Two-step sign-in is OFF. Confirm your password to begin."}
          </p>
          <Field name="password" label="Your password">
            {(f) => <Input {...f} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
          </Field>
          <Button type="submit" variant={enabled ? "danger" : "primary"} disabled={busy}>
            {enabled ? "Turn off two-step sign-in" : "Set up authenticator app"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

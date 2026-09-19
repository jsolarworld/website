"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, Input, Notice } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<"password" | "code">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data, error } = await authClient.signIn.email({ email, password });
    setBusy(false);
    if (error) return setError("Wrong email or password.");
    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) return setStep("code");
    // No authenticator yet: the admin sends them to set one up.
    router.push("/admin");
    router.refresh();
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await authClient.twoFactor.verifyTotp({ code: code.replace(/\s/g, "") });
    setBusy(false);
    if (error) return setError("That code is not right. Codes change every 30 seconds, so try the newest one.");
    router.push("/admin");
    router.refresh();
  }

  if (step === "code") {
    return (
      <form onSubmit={submitCode} className="space-y-5">
        {error && <Notice tone="danger">{error}</Notice>}
        <Field name="code" label="Code from your authenticator app" hint="6 digits">
          {(f) => <Input {...f} inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} autoFocus />}
        </Field>
        <Button type="submit" variant="primary" block disabled={busy}>
          {busy ? "Checking…" : "Verify"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={submitPassword} className="space-y-5">
      {error && <Notice tone="danger">{error}</Notice>}
      <Field name="email" label="Email">
        {(f) => <Input {...f} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />}
      </Field>
      <Field name="password" label="Password">
        {(f) => <Input {...f} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
      </Field>
      <Button type="submit" variant="primary" block disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

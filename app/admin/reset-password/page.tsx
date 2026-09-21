import Link from "next/link";
import { ResetPasswordForm } from "@/components/admin/reset-password-form";
import { Container, Notice } from "@/components/ui";

export const metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  return (
    <Container className="max-w-md py-16">
      <h1 className="text-display-3">Choose a new password</h1>
      <div className="mt-8">
        {token && !error ? (
          <ResetPasswordForm token={token} />
        ) : (
          <Notice tone="danger" title="This link does not work">
            It has expired or was already used. <Link href="/admin/forgot-password" className="underline">Ask for a new one</Link>.
          </Notice>
        )}
      </div>
    </Container>
  );
}

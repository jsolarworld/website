import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { Container, Notice } from "@/components/ui";
import { getStaffOrNull } from "@/lib/admin/guard";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; reset?: string }> }) {
  if (await getStaffOrNull()) redirect("/admin");
  const { error, reset } = await searchParams;
  return (
    <Container className="max-w-md py-16">
      <h1 className="text-display-3">Staff sign in</h1>
      <p className="mt-2 text-sm text-muted">For J Solar World staff only.</p>
      {reset === "1" && (
        <Notice tone="positive" className="mt-6">
          Password changed. Sign in with the new one.
        </Notice>
      )}
      {error === "not-staff" && (
        <Notice tone="danger" className="mt-6">
          That account does not have admin access.
        </Notice>
      )}
      <div className="mt-8">
        <LoginForm />
      </div>
    </Container>
  );
}

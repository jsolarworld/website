import { ForgotPasswordForm } from "@/components/admin/forgot-password-form";
import { Container } from "@/components/ui";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <Container className="max-w-md py-16">
      <h1 className="text-display-3">Forgot your password?</h1>
      <p className="mt-2 text-sm text-muted">Enter your staff email and we will send you a link to choose a new one.</p>
      <div className="mt-8">
        <ForgotPasswordForm />
      </div>
    </Container>
  );
}

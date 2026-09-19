import { SecurityPanel } from "@/components/admin/security-panel";
import { Container, Notice } from "@/components/ui";
import { requireStaff } from "@/lib/admin/guard";

export const metadata = { title: "Security" };

export default async function SecurityPage() {
  // allowWithout2fa: this is the page that fixes a missing authenticator, so it must not redirect to itself.
  const staff = await requireStaff(undefined, { allowWithout2fa: true });
  return (
    <Container className="max-w-xl py-12">
      <h1 className="text-display-3">Security</h1>
      {!staff.twoFactorEnabled && (
        <Notice tone="warning" title="Set up your authenticator app to continue" className="mt-6">
          Staff accounts need a second sign-in step. Install Google Authenticator, Microsoft Authenticator or Authy on your phone first.
        </Notice>
      )}
      <div className="mt-8">
        <SecurityPanel enabled={staff.twoFactorEnabled} />
      </div>
    </Container>
  );
}

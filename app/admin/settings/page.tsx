import { SettingsForm } from "@/components/admin/settings-form";
import { Container } from "@/components/ui";
import { requireStaff } from "@/lib/admin/guard";
import { getBank, getOrderSettings } from "@/lib/settings";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireStaff("settings:write");
  const [bank, orders] = await Promise.all([getBank(), getOrderSettings()]);
  return (
    <Container className="max-w-2xl py-8">
      <h1 className="text-display-3">Settings</h1>
      <div className="mt-8">
        <SettingsForm bank={bank} orders={orders} />
      </div>
    </Container>
  );
}

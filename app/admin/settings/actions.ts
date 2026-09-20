"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/admin/audit";
import { requireStaff } from "@/lib/admin/guard";
import { parseSettingsForm } from "@/lib/admin/settings-form";
import { db } from "@/lib/db";
import { BANK_KEY, ORDER_KEY, getBank, getOrderSettings } from "@/lib/settings";

export interface SettingsState {
  errors?: Record<string, string>;
  saved?: boolean;
  message?: string;
}

export async function saveSettings(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  // Owners only: these settings decide where customers' money goes.
  const staff = await requireStaff("settings:write");
  const parsed = parseSettingsForm(formData);
  if (!parsed.ok) return { errors: parsed.errors };

  const [oldBank, oldOrders] = await Promise.all([getBank(), getOrderSettings()]);
  const { bank, holdHours } = parsed.data;

  await db.$transaction([
    db.setting.upsert({ where: { key: BANK_KEY }, create: { key: BANK_KEY, value: bank }, update: { value: bank } }),
    db.setting.upsert({ where: { key: ORDER_KEY }, create: { key: ORDER_KEY, value: { holdHours } }, update: { value: { holdHours } } }),
  ]);

  // Changing the account number is the most sensitive edit in the system, so it is always logged.
  if (JSON.stringify(oldBank) !== JSON.stringify(bank)) {
    await logAudit({ actorId: staff.id, action: "settings.bank", entity: "Setting", entityId: BANK_KEY, before: { ...oldBank }, after: { ...bank } });
  }
  if (oldOrders.holdHours !== holdHours) {
    await logAudit({ actorId: staff.id, action: "settings.orders", entity: "Setting", entityId: ORDER_KEY, before: { holdHours: oldOrders.holdHours }, after: { holdHours } });
  }

  revalidatePath("/admin/settings");
  revalidatePath("/checkout");
  return { saved: true };
}

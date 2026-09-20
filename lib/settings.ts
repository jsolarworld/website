import "server-only";
import { db } from "./db";

/** Admin-editable business settings, stored as rows in the Setting table. Defaults apply until a row exists. */

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface OrderSettings {
  /** Hours an unpaid order holds its stock before it expires. */
  holdHours: number;
}

export const BANK_KEY = "business.bank";
export const ORDER_KEY = "orders.settings";

// From the owner, verified in the WhatsApp chat.
export const DEFAULT_BANK: BankDetails = {
  bankName: "FCMB",
  accountNumber: "1049984602",
  accountName: "J SOLAR WORLD ENERGY",
};
export const DEFAULT_ORDER_SETTINGS: OrderSettings = { holdHours: 24 };

export async function getBank(): Promise<BankDetails> {
  const row = await db.setting.findUnique({ where: { key: BANK_KEY } });
  return { ...DEFAULT_BANK, ...((row?.value ?? {}) as Partial<BankDetails>) };
}

export async function getOrderSettings(): Promise<OrderSettings> {
  const row = await db.setting.findUnique({ where: { key: ORDER_KEY } });
  return { ...DEFAULT_ORDER_SETTINGS, ...((row?.value ?? {}) as Partial<OrderSettings>) };
}

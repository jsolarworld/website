"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/admin/audit";
import { requireStaff } from "@/lib/admin/guard";
import { db } from "@/lib/db";
import type { OrderStatus } from "@/lib/orders/rules";
import { changeOrderStatus, confirmPayment, reconcileOrder } from "@/lib/orders/service";

export interface OrderActionState {
  error?: string;
  message?: string;
}

const done = (id: string, message: string): OrderActionState => {
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
  return { message };
};

/** Staff checked their bank app and the money is there. This is the only way a transfer order becomes Paid. */
export async function confirmTransfer(_prev: OrderActionState, formData: FormData): Promise<OrderActionState> {
  const staff = await requireStaff("orders:write");
  const orderId = String(formData.get("orderId") ?? "");
  const payment = await db.payment.findFirst({
    where: { orderId, method: "BANK_TRANSFER", status: { in: ["PENDING", "PROOF_SUBMITTED"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!payment) return { error: "There is no transfer waiting to be confirmed on this order." };
  // The receipt is only evidence: the confirm button asserts that the funds are in the account.
  if (formData.get("funds") !== "on") return { error: "Tick the box to confirm the money is in the bank account." };

  const result = await confirmPayment(payment.id, { actorId: staff.id, note: `Bank transfer confirmed by ${staff.name}` });
  if (result === "already") return { error: "This payment was already confirmed." };
  await logAudit({ actorId: staff.id, action: "order.confirm_transfer", entity: "Order", entityId: orderId, after: { amountNgn: payment.amountNgn } });
  return done(orderId, "Payment confirmed. The order is now paid.");
}

export async function advanceOrder(_prev: OrderActionState, formData: FormData): Promise<OrderActionState> {
  const staff = await requireStaff("orders:write");
  const orderId = String(formData.get("orderId") ?? "");
  const to = String(formData.get("to") ?? "") as OrderStatus;
  const note = String(formData.get("note") ?? "").trim().slice(0, 300) || undefined;
  const error = await changeOrderStatus(orderId, to, staff.id, note);
  if (error) return { error };
  await logAudit({ actorId: staff.id, action: "order.status", entity: "Order", entityId: orderId, after: { to, note: note ?? null } });
  return done(orderId, "Order updated.");
}

/** Ask Paystack again about this order's open payments (a customer who paid but never came back). */
export async function reverifyOrder(_prev: OrderActionState, formData: FormData): Promise<OrderActionState> {
  await requireStaff("orders:write");
  const orderId = String(formData.get("orderId") ?? "");
  try {
    await reconcileOrder(orderId);
  } catch (e) {
    console.error("reverify failed", e);
    return { error: "Could not reach Paystack. Try again in a moment." };
  }
  return done(orderId, "Checked with Paystack. If the customer paid, the order is now marked paid.");
}

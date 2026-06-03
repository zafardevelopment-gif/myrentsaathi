/**
 * Payment recording. Inserting a row fires the DB trigger
 * (billing-03-payments.sql) which recomputes invoice amount_paid + status.
 * Used by manual entry, the Razorpay webhook (Phase 10) and deposit
 * adjustments (Phase 9).
 */

import { supabaseAdmin } from "../supabase-admin";
import type { PaymentMethod } from "./types";

export type RecordPaymentInput = {
  invoice_id: string;
  amount: number;
  method?: PaymentMethod;
  payment_date?: string; // 'YYYY-MM-DD'
  reference?: string | null;
  razorpay_order_id?: string | null;
  payment_link_id?: string | null;
  receipt_url?: string | null;
  status?: "confirmed" | "pending_verification";
  recorded_by?: string | null;
};

export type RecordPaymentResult =
  | { success: true; paymentId: string; invoice: { status: string; amount_paid: number; total_amount: number; outstanding: number } }
  | { success: false; error: string };

export async function recordPayment(input: RecordPaymentInput): Promise<RecordPaymentResult> {
  try {
    if (!input.invoice_id) return { success: false, error: "invoice_id is required" };
    if (!input.amount || input.amount <= 0) return { success: false, error: "amount must be greater than 0" };

    // Ensure the invoice exists and isn't cancelled.
    const { data: inv } = await supabaseAdmin
      .from("invoices").select("id, status, total_amount").eq("id", input.invoice_id).maybeSingle();
    if (!inv) return { success: false, error: "Invoice not found" };
    if (inv.status === "cancelled") return { success: false, error: "Cannot record payment on a cancelled invoice" };

    const { data: payment, error } = await supabaseAdmin
      .from("invoice_payments")
      .insert({
        invoice_id: input.invoice_id,
        amount: input.amount,
        method: input.method ?? "cash",
        payment_date: input.payment_date ?? new Date().toISOString().slice(0, 10),
        reference: input.reference ?? null,
        razorpay_order_id: input.razorpay_order_id ?? null,
        payment_link_id: input.payment_link_id ?? null,
        receipt_url: input.receipt_url ?? null,
        status: input.status ?? "confirmed",
        recorded_by: input.recorded_by ?? null,
      })
      .select("id")
      .single();
    if (error || !payment) return { success: false, error: error?.message ?? "Failed to record payment" };

    // Re-read invoice (the trigger has updated amount_paid + status).
    const { data: updated } = await supabaseAdmin
      .from("invoices").select("status, amount_paid, total_amount").eq("id", input.invoice_id).single();

    return {
      success: true,
      paymentId: payment.id,
      invoice: {
        status: updated?.status ?? inv.status,
        amount_paid: updated?.amount_paid ?? 0,
        total_amount: updated?.total_amount ?? inv.total_amount,
        outstanding: (updated?.total_amount ?? inv.total_amount) - (updated?.amount_paid ?? 0),
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Update a payment's verification status (landlord approves/rejects an uploaded receipt). */
export async function setPaymentStatus(
  paymentId: string,
  status: "confirmed" | "rejected",
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabaseAdmin.from("invoice_payments").update({ status }).eq("id", paymentId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

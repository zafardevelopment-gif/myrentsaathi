/**
 * Security deposit ledger (§20). Append-only; balance_after maintained per
 * entry. Seed 'collected' from the agreement's security_deposit, then track
 * deductions / interest / refunds.
 */

import { supabaseAdmin } from "../supabase-admin";
import { round2 } from "./money";

export async function getDepositLedger(agreementId: string) {
  const { data: entries } = await supabaseAdmin
    .from("deposit_ledger").select("*").eq("agreement_id", agreementId).order("entry_date").order("created_at");
  const balance = (entries ?? []).reduce((a, e) => a + Number(e.amount), 0);
  return { entries: entries ?? [], balance: round2(balance) };
}

export type DepositEntryInput = {
  agreement_id: string;
  entry_type: "collected" | "deduction" | "interest" | "refund" | "adjustment" | "forfeit";
  amount: number; // caller passes signed amount
  reason?: string | null;
  linked_invoice_id?: string | null;
  linked_payment_id?: string | null;
  created_by?: string | null;
};

export async function addDepositEntry(input: DepositEntryInput): Promise<{ success: boolean; error?: string; balance?: number }> {
  // Context (society/landlord/flat/tenant) from the agreement.
  const { data: ag } = await supabaseAdmin
    .from("agreements").select("society_id, landlord_id, flat_id, tenant_id").eq("id", input.agreement_id).maybeSingle();
  if (!ag) return { success: false, error: "Agreement not found" };

  const { balance } = await getDepositLedger(input.agreement_id);
  const newBalance = round2(balance + input.amount);

  const { error } = await supabaseAdmin.from("deposit_ledger").insert({
    society_id: ag.society_id ?? null,
    landlord_id: ag.landlord_id ?? null,
    flat_id: ag.flat_id ?? null,
    tenant_id: ag.tenant_id ?? null,
    agreement_id: input.agreement_id,
    entry_type: input.entry_type,
    amount: input.amount,
    balance_after: newBalance,
    reason: input.reason ?? null,
    linked_invoice_id: input.linked_invoice_id ?? null,
    linked_payment_id: input.linked_payment_id ?? null,
    created_by: input.created_by ?? null,
  });
  if (error) return { success: false, error: error.message };
  return { success: true, balance: newBalance };
}

/** Seed the initial 'collected' entry from agreements.security_deposit (idempotent). */
export async function seedDepositFromAgreement(agreementId: string, createdBy?: string | null) {
  const { data: existing } = await supabaseAdmin
    .from("deposit_ledger").select("id").eq("agreement_id", agreementId).eq("entry_type", "collected").maybeSingle();
  if (existing) return { success: true as const, alreadySeeded: true };
  const { data: ag } = await supabaseAdmin.from("agreements").select("security_deposit").eq("id", agreementId).maybeSingle();
  const amount = Number(ag?.security_deposit ?? 0);
  if (!amount) return { success: true as const, alreadySeeded: false };
  const res = await addDepositEntry({ agreement_id: agreementId, entry_type: "collected", amount, reason: "Initial deposit", created_by: createdBy });
  return { success: res.success, error: res.error, alreadySeeded: false };
}

/**
 * Late-fee engine (§21). Applies a configurable penalty as a single
 * idempotent `late_fee` line on each overdue invoice, then recomputes totals.
 * Re-running updates the same line (no double-charging).
 */

import { supabaseAdmin } from "../supabase-admin";
import type { BillerScope } from "./scope";
import { scopeColumn } from "./scope";
import { recomputeInvoiceTotals } from "./invoice-service";
import { round2 } from "./money";

type Rule = {
  invoice_type: string; grace_days: number; fee_type: "flat" | "percent_outstanding" | "per_day";
  fee_value: number; max_fee: number | null;
};

function daysBetween(fromISO: string, toISO: string): number {
  const a = new Date(fromISO + "T00:00:00Z").getTime();
  const b = new Date(toISO + "T00:00:00Z").getTime();
  return Math.floor((b - a) / 86_400_000);
}

function computeFee(rule: Rule, outstanding: number, effectiveDays: number): number {
  let fee = 0;
  if (rule.fee_type === "flat") fee = rule.fee_value;
  else if (rule.fee_type === "percent_outstanding") fee = (outstanding * rule.fee_value) / 100;
  else if (rule.fee_type === "per_day") fee = rule.fee_value * effectiveDays;
  if (rule.max_fee != null) fee = Math.min(fee, rule.max_fee);
  return round2(Math.max(fee, 0));
}

export type LateFeeResult = { applied: number; skipped: number; errors: { ref: string; message: string }[] };

export async function applyLateFees(scope: BillerScope, asOf?: string): Promise<LateFeeResult> {
  const today = asOf ?? new Date().toISOString().slice(0, 10);
  const { column, value } = scopeColumn(scope);

  // Active rules for this scope.
  const { data: ruleRows } = await supabaseAdmin
    .from("late_fee_rules").select("invoice_type, grace_days, fee_type, fee_value, max_fee")
    .eq(column, value).eq("is_active", true)
    .lte("effective_from", today).or(`effective_to.is.null,effective_to.gte.${today}`);
  const rules = (ruleRows ?? []) as Rule[];
  if (rules.length === 0) return { applied: 0, skipped: 0, errors: [] };
  const specific = new Map(rules.filter((r) => r.invoice_type !== "all").map((r) => [r.invoice_type, r]));
  const allRule = rules.find((r) => r.invoice_type === "all") ?? null;

  // Overdue / unpaid past-due invoices in scope.
  const { data: invoices } = await supabaseAdmin
    .from("invoices")
    .select("id, invoice_type, total_amount, amount_paid, due_date, status")
    .eq(column, value)
    .in("status", ["unpaid", "partially_paid", "overdue"])
    .not("due_date", "is", null)
    .lt("due_date", today);

  const errors: LateFeeResult["errors"] = [];
  let applied = 0;
  let skipped = 0;

  for (const inv of invoices ?? []) {
    try {
      const rule = specific.get(inv.invoice_type) ?? allRule;
      if (!rule) { skipped++; continue; }
      const overdueDays = daysBetween(inv.due_date, today);
      const effective = overdueDays - rule.grace_days;
      if (effective <= 0) { skipped++; continue; }

      const outstanding = Number(inv.total_amount) - Number(inv.amount_paid);
      const fee = computeFee(rule, outstanding, effective);
      if (fee <= 0) { skipped++; continue; }

      const description = `Late fee (${rule.fee_type}, ${overdueDays}d overdue)`;
      const { data: existing } = await supabaseAdmin
        .from("invoice_line_items").select("id").eq("invoice_id", inv.id).eq("line_kind", "late_fee").maybeSingle();

      if (existing) {
        await supabaseAdmin.from("invoice_line_items")
          .update({ description, unit_rate: fee, line_total: fee }).eq("id", existing.id);
      } else {
        await supabaseAdmin.from("invoice_line_items").insert({
          invoice_id: inv.id, line_kind: "late_fee", description,
          quantity: 1, unit_rate: fee, line_total: fee, gst_applicable: false,
        });
      }
      await recomputeInvoiceTotals(inv.id);
      applied++;
    } catch (e) {
      errors.push({ ref: inv.id, message: e instanceof Error ? e.message : String(e) });
    }
  }
  return { applied, skipped, errors };
}

/** Waive a late fee: remove the line + recompute (§21 waiver). */
export async function waiveLateFee(invoiceId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabaseAdmin
    .from("invoice_line_items").delete().eq("invoice_id", invoiceId).eq("line_kind", "late_fee");
  if (error) return { success: false, error: error.message };
  await recomputeInvoiceTotals(invoiceId);
  return { success: true };
}

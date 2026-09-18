/**
 * Late-fee engine. Applies a configurable penalty into the `invoice_late_fees`
 * ledger for each overdue invoice; a DB trigger (sync_invoice_late_fee_total)
 * keeps invoices.late_fee_total in sync. total_amount is NOT touched — it
 * stays sub_total + gst_amount. Callers computing "how much is owed" must
 * use total_amount + late_fee_total - amount_paid.
 */

import { supabaseAdmin } from "../supabase-admin";
import type { BillerScope } from "./scope";
import { scopeColumn } from "./scope";
import { round2 } from "./money";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Today's date in Asia/Kolkata as YYYY-MM-DD. */
function istToday(now: Date): string {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Whole days between two YYYY-MM-DD dates (date-only, no time-of-day drift). */
function daysBetween(fromISO: string, toISO: string): number {
  const a = new Date(fromISO + "T00:00:00Z").getTime();
  const b = new Date(toISO + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86_400_000);
}

function istMonthKey(iso: string): string {
  return iso.slice(0, 7); // "YYYY-MM"
}

type Rule = {
  id: string;
  invoice_type: string | null;
  grace_days: number;
  fee_type: "flat" | "percent";
  fee_value: number;
  recurrence: "once" | "daily" | "monthly";
  max_fee: number | null;
  effective_from: string;
};

type OpenInvoice = {
  id: string;
  invoice_type: string;
  total_amount: number;
  late_fee_total: number;
  amount_paid: number;
  due_date: string;
  status: string;
};

function periodKeyFor(rule: Rule, today: string): string {
  if (rule.recurrence === "once") return "once";
  if (rule.recurrence === "daily") return today;
  return istMonthKey(today); // monthly
}

function computeFee(rule: Rule, outstanding: number): number {
  const raw = rule.fee_type === "flat" ? rule.fee_value : round2((outstanding * rule.fee_value) / 100);
  return round2(Math.max(raw, 0));
}

export type LateFeeResult = {
  scanned: number;
  applied: number;
  skipped: number;
  totalAmount: number;
  skippedByCap: number;
  errors: { ref: string; message: string }[];
};

export async function applyLateFees(
  opts?: { scope?: BillerScope; now?: Date; dryRun?: boolean },
): Promise<LateFeeResult> {
  const today = istToday(opts?.now ?? new Date());
  const dryRun = opts?.dryRun ?? false;

  let ruleQuery = supabaseAdmin
    .from("late_fee_rules")
    .select("id, society_id, landlord_id, invoice_type, grace_days, fee_type, fee_value, recurrence, max_fee, effective_from")
    .eq("is_active", true);
  if (opts?.scope) {
    const { column, value } = scopeColumn(opts.scope);
    ruleQuery = ruleQuery.eq(column, value);
  }
  const { data: ruleRows } = await ruleQuery;
  const rules = (ruleRows ?? []) as (Rule & { society_id: string | null; landlord_id: string | null })[];

  const result: LateFeeResult = { scanned: 0, applied: 0, skipped: 0, totalAmount: 0, skippedByCap: 0, errors: [] };
  if (rules.length === 0) return result;

  // Group rules by scope so each invoice is matched against only its own biller's rules.
  const rulesByScopeKey = new Map<string, Rule[]>();
  for (const r of rules) {
    const key = r.society_id ? `s:${r.society_id}` : `l:${r.landlord_id}`;
    const list = rulesByScopeKey.get(key) ?? [];
    list.push(r);
    rulesByScopeKey.set(key, list);
  }

  for (const [scopeKey, scopeRules] of rulesByScopeKey) {
    const [kind, id] = scopeKey.split(":");
    const column = kind === "s" ? "society_id" : "landlord_id";

    const { data: invoices } = await supabaseAdmin
      .from("invoices")
      .select("id, invoice_type, total_amount, late_fee_total, amount_paid, due_date, status")
      .eq(column, id)
      .in("status", ["unpaid", "partially_paid", "overdue"])
      .not("due_date", "is", null)
      .lt("due_date", today);

    const specific = new Map(scopeRules.filter((r) => r.invoice_type).map((r) => [r.invoice_type, r]));
    const allRule = scopeRules.find((r) => !r.invoice_type) ?? null;

    for (const inv of (invoices ?? []) as OpenInvoice[]) {
      result.scanned++;
      try {
        const rule = specific.get(inv.invoice_type) ?? allRule;
        if (!rule) { result.skipped++; continue; }
        if (inv.due_date < rule.effective_from) { result.skipped++; continue; }

        const daysLate = daysBetween(inv.due_date, today);
        if (daysLate <= rule.grace_days) { result.skipped++; continue; }

        // Monthly recurrence charges only once the day-of-month has rolled past due_date+grace_days.
        if (rule.recurrence === "monthly") {
          const chargeableFrom = new Date(inv.due_date + "T00:00:00Z").getTime() + rule.grace_days * 86_400_000;
          if (new Date(today + "T00:00:00Z").getTime() < chargeableFrom) { result.skipped++; continue; }
        }

        const periodKey = periodKeyFor(rule, today);
        const existingTotal = Number(inv.late_fee_total) || 0;
        const outstanding = round2(Number(inv.total_amount) + existingTotal - Number(inv.amount_paid));
        if (outstanding <= 0) { result.skipped++; continue; }

        let amount = computeFee(rule, outstanding);
        if (rule.max_fee != null) {
          const room = round2(rule.max_fee - existingTotal);
          if (room <= 0) { result.skipped++; result.skippedByCap++; continue; }
          amount = Math.min(amount, room);
        }
        amount = Math.min(amount, outstanding);
        if (amount <= 0) { result.skipped++; continue; }

        if (!dryRun) {
          const { error } = await supabaseAdmin
            .from("invoice_late_fees")
            .upsert(
              {
                invoice_id: inv.id,
                rule_id: rule.id,
                amount,
                period_key: periodKey,
                basis: { outstanding, fee_type: rule.fee_type, fee_value: rule.fee_value, days_late: daysLate, rule_id: rule.id },
              },
              { onConflict: "invoice_id,period_key", ignoreDuplicates: true },
            );
          if (error) { result.errors.push({ ref: inv.id, message: error.message }); continue; }

          if (inv.status !== "overdue") {
            await supabaseAdmin.from("invoices").update({ status: "overdue" }).eq("id", inv.id);
          }
        }

        result.applied++;
        result.totalAmount = round2(result.totalAmount + amount);
      } catch (e) {
        result.errors.push({ ref: inv.id, message: e instanceof Error ? e.message : String(e) });
      }
    }
  }

  return result;
}

/** Waive one late-fee ledger row. The sync trigger recalculates late_fee_total. */
export async function waiveLateFee(
  invoiceId: string,
  lateFeeId: string,
  reason: string,
): Promise<{ success: boolean; error?: string }> {
  if (!reason.trim()) return { success: false, error: "A waiver reason is required" };
  const { error } = await supabaseAdmin
    .from("invoice_late_fees")
    .delete()
    .eq("id", lateFeeId)
    .eq("invoice_id", invoiceId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

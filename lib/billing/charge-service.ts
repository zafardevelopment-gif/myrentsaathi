/**
 * Additional charge types catalog + per-unit recurring charges, and a
 * 'charges' invoice generator (§23). Each charge carries its own GST flag.
 */

import { supabaseAdmin } from "../supabase-admin";
import type { BillerScope } from "./scope";
import { scopeColumn, scopeInsert } from "./scope";
import { createInvoice } from "./invoice-service";
import type { DraftLineItem } from "./types";

// ─── CATALOG ──────────────────────────────────────────────────

export async function listChargeTypes(scope: BillerScope) {
  const { column, value } = scopeColumn(scope);
  const { data } = await supabaseAdmin.from("charge_types").select("*").eq(column, value).order("name");
  return data ?? [];
}

export async function createChargeType(scope: BillerScope, input: {
  code: string; name: string; default_amount?: number; billing_frequency?: string;
  is_metered?: boolean; meter_type?: string; gst_applicable?: boolean;
  default_gst_percent?: number; hsn_sac?: string; default_recipient_type?: string;
}) {
  const { data, error } = await supabaseAdmin.from("charge_types").insert({
    ...scopeInsert(scope),
    code: input.code, name: input.name,
    default_amount: input.default_amount ?? null,
    billing_frequency: input.billing_frequency ?? "monthly",
    is_metered: input.is_metered ?? false,
    meter_type: input.meter_type ?? null,
    gst_applicable: input.gst_applicable ?? false,
    default_gst_percent: input.default_gst_percent ?? 0,
    hsn_sac: input.hsn_sac ?? null,
    default_recipient_type: input.default_recipient_type ?? "tenant",
  }).select("id").single();
  if (error) return { success: false as const, error: error.message };
  return { success: true as const, chargeTypeId: data.id };
}

export async function assignUnitCharge(input: {
  flat_id: string; charge_type_id: string; tenant_id?: string | null;
  amount_override?: number | null; start_period: string; end_period?: string | null;
}) {
  const { data, error } = await supabaseAdmin.from("unit_recurring_charges").upsert({
    flat_id: input.flat_id, charge_type_id: input.charge_type_id,
    tenant_id: input.tenant_id ?? null, amount_override: input.amount_override ?? null,
    start_period: input.start_period, end_period: input.end_period ?? null, is_active: true,
  }, { onConflict: "flat_id,charge_type_id,start_period" }).select("id").single();
  if (error) return { success: false as const, error: error.message };
  return { success: true as const, id: data.id };
}

// ─── 'charges' INVOICE GENERATION ────────────────────────────

function appliesThisPeriod(frequency: string, startPeriod: string, period: string): boolean {
  if (period < startPeriod) return false;
  if (frequency === "one_time") return period === startPeriod;
  if (frequency === "monthly") return true;
  if (frequency === "quarterly") {
    const monthsApart = monthIndex(period) - monthIndex(startPeriod);
    return monthsApart >= 0 && monthsApart % 3 === 0;
  }
  return true;
}
function monthIndex(period: string): number {
  const [y, m] = period.split("-").map(Number);
  return y * 12 + (m - 1);
}

export async function generateChargesForPeriod(input: {
  scope: BillerScope; billing_period: string; due_day?: number; created_by?: string | null; trigger?: "manual" | "cron";
}) {
  const period = input.billing_period;
  const issueDate = `${period}-01`;
  const dueDate = `${period}-${String(input.due_day ?? 5).padStart(2, "0")}`;
  const errors: { ref: string; message: string }[] = [];
  let created = 0;
  let skipped = 0;

  const chargeTypes = await listChargeTypes(input.scope);
  const ctById = new Map(chargeTypes.map((c) => [c.id, c]));

  // flats in scope
  const scopeCol = input.scope.kind === "society" ? "society_id" : "owner_id";
  const scopeVal = input.scope.kind === "society" ? input.scope.societyId : input.scope.landlordId;
  const { data: flats } = await supabaseAdmin.from("flats").select("id").eq(scopeCol, scopeVal);
  const flatIds = (flats ?? []).map((f) => f.id);
  if (flatIds.length === 0) return { created, skipped, errors, runId: null };

  const { data: charges } = await supabaseAdmin
    .from("unit_recurring_charges").select("*").in("flat_id", flatIds).eq("is_active", true);

  // group active charges by flat for this period (skip metered — billed via meters)
  const byFlat = new Map<string, DraftLineItem[]>();
  for (const uc of charges ?? []) {
    const ct = ctById.get(uc.charge_type_id);
    if (!ct || ct.is_metered) continue;
    if (uc.end_period && period > uc.end_period) continue;
    if (!appliesThisPeriod(ct.billing_frequency, uc.start_period, period)) continue;
    const amount = uc.amount_override ?? ct.default_amount ?? 0;
    if (!amount || amount <= 0) continue;
    const arr = byFlat.get(uc.flat_id) ?? [];
    arr.push({
      description: `${ct.name} — ${period}`,
      unit_rate: amount, quantity: 1, line_kind: "charge", charge_type_id: ct.id,
      gst_applicable: !!ct.gst_applicable, gst_percent: Number(ct.default_gst_percent) || 0, hsn_sac: ct.hsn_sac,
    });
    byFlat.set(uc.flat_id, arr);
  }

  for (const [flatId, lines] of byFlat) {
    try {
      const { data: tenantRow } = await supabaseAdmin
        .from("tenants").select("id").eq("flat_id", flatId).eq("status", "active").limit(1).maybeSingle();
      const res = await createInvoice({
        scope: input.scope, invoice_type: "charges", flat_id: flatId, tenant_id: tenantRow?.id ?? null,
        billing_period: period, issue_date: issueDate, due_date: dueDate, lines, created_by: input.created_by ?? null,
      });
      if (res.success) created++;
      else if (res.code === "DUPLICATE") skipped++;
      else errors.push({ ref: flatId, message: res.error });
    } catch (e) {
      errors.push({ ref: flatId, message: e instanceof Error ? e.message : String(e) });
    }
  }

  const { data: run } = await supabaseAdmin.from("invoice_runs").insert({
    invoice_type: "charges", billing_period: period,
    scope_society: input.scope.kind === "society" ? input.scope.societyId : null,
    scope_landlord: input.scope.kind === "landlord" ? input.scope.landlordId : null,
    trigger: input.trigger ?? "manual", count_created: created, count_skipped: skipped, errors,
    finished_at: new Date().toISOString(),
  }).select("id").single();

  return { created, skipped, errors, runId: run?.id ?? null };
}

/**
 * Billing configuration: billing_profiles, invoice_type_config,
 * versioned gst_rate_config (§3.1 supersede), late_fee_rules.
 */

import { supabaseAdmin } from "../supabase-admin";
import type { BillerScope } from "./scope";
import { scopeColumn, scopeInsert } from "./scope";
import { round2 } from "./money";

// ─── billing_profiles ─────────────────────────────────────────

export async function getBillingProfile(scope: BillerScope) {
  const { column, value } = scopeColumn(scope);
  const { data } = await supabaseAdmin.from("billing_profiles").select("*").eq(column, value).maybeSingle();
  return data ?? null;
}

export async function upsertBillingProfile(scope: BillerScope, input: {
  legal_name: string; gst_number?: string | null; pan_number?: string | null;
  state_code?: string | null; address?: string | null; logo_url?: string | null; invoice_prefix?: string;
}) {
  const entity_type = scope.kind === "society" ? "society" : "landlord";
  const entity_id = scope.kind === "society" ? scope.societyId : scope.landlordId;
  const { error } = await supabaseAdmin.from("billing_profiles").upsert({
    entity_type, entity_id, ...scopeInsert(scope),
    legal_name: input.legal_name, gst_number: input.gst_number ?? null, pan_number: input.pan_number ?? null,
    state_code: input.state_code ?? null, address: input.address ?? null, logo_url: input.logo_url ?? null,
    invoice_prefix: input.invoice_prefix ?? "INV", updated_at: new Date().toISOString(),
  }, { onConflict: "entity_type,entity_id" });
  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}

// ─── invoice_type_config ──────────────────────────────────────

export async function listInvoiceTypeConfig(scope: BillerScope) {
  const { column, value } = scopeColumn(scope);
  const { data } = await supabaseAdmin.from("invoice_type_config").select("*").eq(column, value);
  return data ?? [];
}

export async function upsertInvoiceTypeConfig(scope: BillerScope, input: {
  invoice_type: string; gst_applicable: boolean; default_recipient_type?: string;
}) {
  // coalesce unique index → manual find-then-update/insert
  const { column, value } = scopeColumn(scope);
  const { data: existing } = await supabaseAdmin
    .from("invoice_type_config").select("id").eq(column, value).eq("invoice_type", input.invoice_type).maybeSingle();
  if (existing) {
    const { error } = await supabaseAdmin.from("invoice_type_config").update({
      gst_applicable: input.gst_applicable, default_recipient_type: input.default_recipient_type ?? "tenant",
      updated_at: new Date().toISOString(),
    }).eq("id", existing.id);
    if (error) return { success: false as const, error: error.message };
  } else {
    const { error } = await supabaseAdmin.from("invoice_type_config").insert({
      ...scopeInsert(scope), invoice_type: input.invoice_type, gst_applicable: input.gst_applicable,
      default_recipient_type: input.default_recipient_type ?? "tenant",
    });
    if (error) return { success: false as const, error: error.message };
  }
  return { success: true as const };
}

// ─── gst_rate_config (versioned) ─────────────────────────────

export async function listGstRates(scope: BillerScope) {
  const { column, value } = scopeColumn(scope);
  const { data } = await supabaseAdmin
    .from("gst_rate_config").select("*").eq(column, value).order("applies_to").order("effective_from", { ascending: false });
  return data ?? [];
}

/** Change a rate the legally-correct way: close the current active row, insert a new effective-dated one (§3.1). */
export async function addGstRateVersion(scope: BillerScope, input: {
  applies_to: string; rate_percent: number; effective_from?: string; created_by?: string | null;
}) {
  const { column, value } = scopeColumn(scope);
  const effFrom = input.effective_from ?? new Date().toISOString().slice(0, 10);
  const dayBefore = new Date(new Date(effFrom + "T00:00:00Z").getTime() - 86_400_000).toISOString().slice(0, 10);

  // Close the currently-active row for this applies_to.
  await supabaseAdmin.from("gst_rate_config")
    .update({ effective_to: dayBefore, is_active: false })
    .eq(column, value).eq("applies_to", input.applies_to).is("effective_to", null);

  const half = round2(input.rate_percent / 2);
  const { error } = await supabaseAdmin.from("gst_rate_config").insert({
    ...scopeInsert(scope), applies_to: input.applies_to, rate_percent: input.rate_percent,
    cgst_percent: half, sgst_percent: round2(input.rate_percent - half), effective_from: effFrom,
    created_by: input.created_by ?? null,
  });
  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}

// ─── late_fee_rules ──────────────────────────────────────────

export async function listLateFeeRules(scope: BillerScope) {
  const { column, value } = scopeColumn(scope);
  const { data } = await supabaseAdmin.from("late_fee_rules").select("*").eq(column, value).order("created_at");
  return data ?? [];
}

export async function createLateFeeRule(scope: BillerScope, input: {
  invoice_type?: string; grace_days?: number; fee_type?: "flat" | "percent_outstanding" | "per_day";
  fee_value: number; max_fee?: number | null; gst_applicable?: boolean;
}) {
  const { error } = await supabaseAdmin.from("late_fee_rules").insert({
    ...scopeInsert(scope), invoice_type: input.invoice_type ?? "all", grace_days: input.grace_days ?? 0,
    fee_type: input.fee_type ?? "flat", fee_value: input.fee_value, max_fee: input.max_fee ?? null,
    gst_applicable: input.gst_applicable ?? false,
  });
  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}

// ─── reminder_rules ──────────────────────────────────────────

export async function listReminderRules(scope: BillerScope) {
  const { column, value } = scopeColumn(scope);
  const { data } = await supabaseAdmin.from("reminder_rules").select("*").eq(column, value).order("created_at");
  return data ?? [];
}

export async function createReminderRule(scope: BillerScope, input: {
  invoice_type?: string; days_before?: number[]; on_due_date?: boolean;
  days_after?: number[]; month_end_followup?: boolean; channels?: string[];
}) {
  const { error } = await supabaseAdmin.from("reminder_rules").insert({
    ...scopeInsert(scope), invoice_type: input.invoice_type ?? "all",
    days_before: input.days_before ?? [], on_due_date: input.on_due_date ?? true,
    days_after: input.days_after ?? [], month_end_followup: input.month_end_followup ?? false,
    channels: input.channels ?? ["email"],
  });
  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}

// ─── electricity per-unit rate (charge_rate_config) ─────────

export async function getElectricityRate(scope: BillerScope): Promise<number> {
  const { column, value } = scopeColumn(scope);
  const { data } = await supabaseAdmin
    .from("charge_rate_config").select("flat_rate").eq(column, value).eq("charge_kind", "electricity").eq("is_active", true).maybeSingle();
  return Number(data?.flat_rate ?? 0);
}

export async function setElectricityRate(scope: BillerScope, rate: number): Promise<{ success: boolean; error?: string }> {
  const { column, value } = scopeColumn(scope);
  const { data: existing } = await supabaseAdmin
    .from("charge_rate_config").select("id").eq(column, value).eq("charge_kind", "electricity").eq("is_active", true).maybeSingle();
  if (existing) {
    const { error } = await supabaseAdmin.from("charge_rate_config").update({ flat_rate: rate }).eq("id", existing.id);
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await supabaseAdmin.from("charge_rate_config").insert({ ...scopeInsert(scope), charge_kind: "electricity", rate_type: "flat", flat_rate: rate });
    if (error) return { success: false, error: error.message };
  }
  return { success: true };
}

// ─── invoice_templates (§25) ─────────────────────────────────

export async function listTemplates(scope: BillerScope) {
  const { column, value } = scopeColumn(scope);
  const { data } = await supabaseAdmin.from("invoice_templates").select("*").eq(column, value).order("created_at");
  return data ?? [];
}

export async function upsertTemplate(scope: BillerScope, input: {
  id?: string; name: string; applies_to?: string; is_default?: boolean; config?: Record<string, unknown>;
}) {
  if (input.id) {
    const { error } = await supabaseAdmin.from("invoice_templates").update({
      name: input.name, applies_to: input.applies_to ?? "all", is_default: input.is_default ?? false,
      config: input.config ?? {}, updated_at: new Date().toISOString(),
    }).eq("id", input.id);
    if (error) return { success: false as const, error: error.message };
    return { success: true as const, id: input.id };
  }
  const { data, error } = await supabaseAdmin.from("invoice_templates").insert({
    ...scopeInsert(scope), name: input.name, applies_to: input.applies_to ?? "all",
    is_default: input.is_default ?? false, config: input.config ?? {},
  }).select("id").single();
  if (error) return { success: false as const, error: error.message };
  return { success: true as const, id: data.id };
}

/** Resolve the template config to render an invoice with (§25 precedence). */
export async function resolveTemplateConfig(scope: BillerScope, invoiceType: string, templateId?: string | null): Promise<Record<string, unknown>> {
  if (templateId) {
    const { data } = await supabaseAdmin.from("invoice_templates").select("config").eq("id", templateId).maybeSingle();
    if (data) return (data.config as Record<string, unknown>) ?? {};
  }
  const { column, value } = scopeColumn(scope);
  const { data: typed } = await supabaseAdmin.from("invoice_templates").select("config").eq(column, value).eq("applies_to", invoiceType).maybeSingle();
  if (typed) return (typed.config as Record<string, unknown>) ?? {};
  const { data: def } = await supabaseAdmin.from("invoice_templates").select("config").eq(column, value).eq("is_default", true).maybeSingle();
  return (def?.config as Record<string, unknown>) ?? {};
}

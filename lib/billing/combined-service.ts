/**
 * Consolidated monthly bill (ONE invoice per flat per month, accumulating
 * Rent + Maintenance + Electricity lines). Adding electricity/maintenance later
 * APPENDS to the same period's invoice, so rent + the extras go to the tenant as
 * a single bill / reminder.
 *
 * GST is applied per line from the per-type rates configured in settings
 * (rent / maintenance / electricity). Electricity = (current − last) × ₹/unit;
 * the current reading becomes next month's "last".
 */

import { supabaseAdmin } from "../supabase-admin";
import type { BillerScope } from "./scope";
import { createInvoice, recomputeInvoiceTotals } from "./invoice-service";
import { getActiveChargeRate } from "./rates";
import { getActiveGstRate, computeLine } from "./gst";
import { round2, formatINR } from "./money";
import type { DraftLineItem } from "./types";

// ─── PREFILL ──────────────────────────────────────────────────

export type BillPrefillFlat = {
  flat_id: string; flat_number: string; block: string | null; tenant_id: string | null;
  occupied: boolean; rent: number; maintenance_default: number; last_reading: number;
};

export async function getBillPrefill(scope: BillerScope, period: string): Promise<{ flats: BillPrefillFlat[]; elec_rate: number }> {
  const scopeCol = scope.kind === "society" ? "society_id" : "owner_id";
  const scopeVal = scope.kind === "society" ? scope.societyId : scope.landlordId;
  const { data: flats } = await supabaseAdmin
    .from("flats").select("id, flat_number, block, current_tenant_id, monthly_rent, maintenance_amount")
    .eq(scopeCol, scopeVal).order("flat_number");

  const out: BillPrefillFlat[] = [];
  for (const f of flats ?? []) {
    const { data: ag } = await supabaseAdmin
      .from("agreements").select("monthly_rent").eq("flat_id", f.id).eq("status", "active").limit(1).maybeSingle();
    const { data: tenantRow } = await supabaseAdmin
      .from("tenants").select("id").eq("flat_id", f.id).eq("status", "active").limit(1).maybeSingle();

    let last_reading = 0;
    const { data: meters } = await supabaseAdmin
      .from("meters").select("id, initial_reading").eq("flat_id", f.id).eq("meter_type", "electricity").eq("scope", "unit");
    if (meters && meters.length > 0) {
      const meterIds = meters.map((m) => m.id);
      const { data: lastR } = await supabaseAdmin
        .from("meter_readings").select("current_reading").in("meter_id", meterIds)
        .lt("billing_period", period).order("billing_period", { ascending: false }).limit(1).maybeSingle();
      if (lastR) {
        last_reading = lastR.current_reading;
      } else {
        const withInitial = meters.find((m) => m.initial_reading != null);
        last_reading = withInitial?.initial_reading ?? 0;
      }
    }
    out.push({
      flat_id: f.id, flat_number: f.flat_number, block: f.block,
      tenant_id: tenantRow?.id ?? null, occupied: !!f.current_tenant_id,
      rent: Number(ag?.monthly_rent ?? f.monthly_rent ?? 0),
      maintenance_default: Number(f.maintenance_amount ?? 0),
      last_reading: Number(last_reading),
    });
  }
  const rate = await getActiveChargeRate(scope, "electricity", `${period}-01`);
  return { flats: out, elec_rate: Number(rate?.flat_rate ?? 0) };
}

// ─── HELPERS ─────────────────────────────────────────────────

async function ensureFlatElecMeter(scope: BillerScope, flatId: string, flatNumber: string): Promise<string | null> {
  const { data: existing } = await supabaseAdmin
    .from("meters").select("id").eq("flat_id", flatId).eq("meter_type", "electricity").eq("scope", "unit").limit(1).maybeSingle();
  if (existing) return existing.id;
  const scopeCols = scope.kind === "society"
    ? { society_id: scope.societyId, landlord_id: null }
    : { society_id: null, landlord_id: scope.landlordId };
  const { data } = await supabaseAdmin.from("meters").insert({
    ...scopeCols, flat_id: flatId, scope: "unit", meter_type: "electricity", meter_number: `ELEC-${flatNumber}`, unit_label: "unit",
  }).select("id").single();
  return data?.id ?? null;
}

async function billerStateCode(scope: BillerScope): Promise<string | null> {
  const col = scope.kind === "society" ? "society_id" : "landlord_id";
  const val = scope.kind === "society" ? scope.societyId : scope.landlordId;
  const { data } = await supabaseAdmin.from("billing_profiles").select("state_code").eq(col, val).maybeSingle();
  return data?.state_code ?? null;
}

/** Compute one line's GST split and insert it into an EXISTING invoice. */
async function appendLine(invoiceId: string, draft: DraftLineItem, billerState: string | null, placeOfSupply: string | null) {
  const rate = { rate_percent: draft.gst_percent ?? 0, cgst_percent: 0, sgst_percent: 0 };
  const c = computeLine(draft, rate, billerState, placeOfSupply);
  await supabaseAdmin.from("invoice_line_items").insert({
    invoice_id: invoiceId, line_kind: c.line_kind, charge_type_id: c.charge_type_id, description: c.description,
    hsn_sac: c.hsn_sac, quantity: c.quantity, unit_rate: c.unit_rate, line_total: c.line_total,
    gst_applicable: c.gst_applicable, gst_percent: c.gst_percent, gst_amount: c.gst_amount,
    cgst_percent: c.cgst_percent, cgst_amount: c.cgst_amount, sgst_percent: c.sgst_percent, sgst_amount: c.sgst_amount,
    igst_percent: c.igst_percent, igst_amount: c.igst_amount, meter_reading_id: c.meter_reading_id, sort_order: c.sort_order,
  });
  await recomputeInvoiceTotals(invoiceId);
}

// ─── GENERATE / APPEND COMBINED BILL ─────────────────────────

export type CombinedFlatInput = {
  flat_id: string;
  rent?: number;
  maintenance?: number;
  electricity?: { current_reading: number; last_reading?: number };
};

export async function generateCombinedForPeriod(input: {
  scope: BillerScope; billing_period: string; due_day?: number; created_by?: string | null;
  flats: CombinedFlatInput[]; elec_rate?: number; trigger?: "manual" | "cron";
}): Promise<{ created: number; updated: number; skipped: number; errors: { ref: string; message: string }[]; runId: string | null; invoiceIds: string[] }> {
  const period = input.billing_period;
  const issueDate = `${period}-01`;
  // Default rent due date = last day of the billing month (unless a due_day is set).
  const [dyY, dyM] = period.split("-").map(Number);
  const lastDay = new Date(dyY, dyM, 0).getDate();
  const dueDate = `${period}-${String(input.due_day ?? lastDay).padStart(2, "0")}`;
  const monthLabel = new Date(`${period}-01`).toLocaleString("en-IN", { month: "long", year: "numeric" });
  const errors: { ref: string; message: string }[] = [];
  const invoiceIds: string[] = [];
  let created = 0, updated = 0, skipped = 0;

  // Per-unit electricity rate (₹/unit) — distinct from electricity GST %.
  let elecUnitRate = input.elec_rate;
  if (elecUnitRate == null) {
    const r = await getActiveChargeRate(input.scope, "electricity", issueDate);
    elecUnitRate = Number(r?.flat_rate ?? 0);
  }
  // Persist the per-unit rate (so it's the current rate next time).
  if (input.elec_rate != null && input.elec_rate > 0) {
    const col = input.scope.kind === "society" ? "society_id" : "landlord_id";
    const val = input.scope.kind === "society" ? input.scope.societyId : input.scope.landlordId;
    const scopeCols = input.scope.kind === "society" ? { society_id: input.scope.societyId, landlord_id: null } : { society_id: null, landlord_id: input.scope.landlordId };
    const { data: er } = await supabaseAdmin.from("charge_rate_config").select("id").eq(col, val).eq("charge_kind", "electricity").eq("is_active", true).maybeSingle();
    if (er) await supabaseAdmin.from("charge_rate_config").update({ flat_rate: input.elec_rate }).eq("id", er.id);
    else await supabaseAdmin.from("charge_rate_config").insert({ ...scopeCols, charge_kind: "electricity", rate_type: "flat", flat_rate: input.elec_rate });
  }

  // Per-type GST % (from settings) — resolved as of TODAY so a freshly-set rate
  // applies to the bill you generate now (it's still snapshotted onto the invoice).
  const today = new Date().toISOString().slice(0, 10);
  const rentGst = (await getActiveGstRate(input.scope, "rent", today)).rate_percent;
  const maintGst = (await getActiveGstRate(input.scope, "maintenance", today)).rate_percent;
  const elecGst = (await getActiveGstRate(input.scope, "electricity", today)).rate_percent;
  const billerState = await billerStateCode(input.scope);

  for (const fi of input.flats) {
    try {
      const { data: flat } = await supabaseAdmin
        .from("flats").select("id, flat_number, monthly_rent").eq("id", fi.flat_id).maybeSingle();
      if (!flat) { errors.push({ ref: fi.flat_id, message: "Flat not found" }); continue; }

      const { data: tenantRow } = await supabaseAdmin.from("tenants").select("id").eq("flat_id", fi.flat_id).eq("status", "active").limit(1).maybeSingle();
      const { data: ag } = await supabaseAdmin.from("agreements").select("id, monthly_rent").eq("flat_id", fi.flat_id).eq("status", "active").limit(1).maybeSingle();

      // Build electricity line (if a reading was entered) + persist reading.
      let elecLine: DraftLineItem | null = null;
      if (fi.electricity && fi.electricity.current_reading != null) {
        const meterId = await ensureFlatElecMeter(input.scope, fi.flat_id, flat.flat_number);
        if (meterId) {
          let last = fi.electricity.last_reading;
          if (last == null) {
            const { data: allMeters } = await supabaseAdmin.from("meters").select("id").eq("flat_id", fi.flat_id).eq("meter_type", "electricity").eq("scope", "unit");
            const allMeterIds = (allMeters ?? []).map((m) => m.id).filter(Boolean);
            const { data: lastR } = allMeterIds.length
              ? await supabaseAdmin.from("meter_readings").select("current_reading").in("meter_id", allMeterIds)
                  .lt("billing_period", period).order("billing_period", { ascending: false }).limit(1).maybeSingle()
              : await supabaseAdmin.from("meter_readings").select("current_reading").eq("meter_id", meterId)
                  .lt("billing_period", period).order("billing_period", { ascending: false }).limit(1).maybeSingle();
            last = Number(lastR?.current_reading ?? 0);
          }
          const units = Math.max(Number(fi.electricity.current_reading) - Number(last), 0);
          const { data: rr } = await supabaseAdmin.from("meter_readings").upsert({
            meter_id: meterId, billing_period: period, previous_reading: last, current_reading: fi.electricity.current_reading,
          }, { onConflict: "meter_id,billing_period" }).select("id").single();
          if (units > 0 && elecUnitRate > 0) {
            elecLine = {
              description: `Electricity — Reading ${last} → ${fi.electricity.current_reading} = ${units} units @ ${formatINR(elecUnitRate)}/unit (${monthLabel})`,
              unit_rate: round2(units * elecUnitRate), quantity: 1, line_kind: "base",
              gst_applicable: elecGst > 0, gst_percent: elecGst, meter_reading_id: rr?.id ?? null,
            };
          }
        }
      }

      const maintLine: DraftLineItem | null = (fi.maintenance && fi.maintenance > 0)
        ? { description: `Maintenance — ${monthLabel}`, unit_rate: fi.maintenance, quantity: 1, line_kind: "charge", gst_applicable: maintGst > 0, gst_percent: maintGst }
        : null;

      const rent = fi.rent ?? Number(ag?.monthly_rent ?? flat.monthly_rent ?? 0);
      const rentLine: DraftLineItem | null = rent > 0
        ? { description: `Rent — ${monthLabel}`, unit_rate: rent, quantity: 1, hsn_sac: "997212", line_kind: "base", gst_applicable: rentGst > 0, gst_percent: rentGst }
        : null;

      // Existing invoice for this flat + period?
      const billerCol = input.scope.kind === "society" ? "society_id" : "landlord_id";
      const billerVal = input.scope.kind === "society" ? input.scope.societyId : input.scope.landlordId;
      const { data: existing } = await supabaseAdmin
        .from("invoices").select("id, place_of_supply").eq(billerCol, billerVal)
        .eq("flat_id", fi.flat_id).eq("invoice_type", "rent").eq("billing_period", period).neq("status", "cancelled").maybeSingle();

      if (existing) {
        // APPEND new lines to the existing monthly bill (don't duplicate).
        const { data: existingLines } = await supabaseAdmin
          .from("invoice_line_items").select("description, meter_reading_id").eq("invoice_id", existing.id);
        const descs = new Set((existingLines ?? []).map((l) => l.description));
        const hasElecAlready = (existingLines ?? []).some((l) => l.description?.toLowerCase().includes("electricity"));
        let appended = 0;
        if (maintLine && !descs.has(maintLine.description)) { await appendLine(existing.id, maintLine, billerState, existing.place_of_supply); appended++; }
        if (elecLine && !hasElecAlready) { await appendLine(existing.id, elecLine, billerState, existing.place_of_supply); appended++; }
        if (appended > 0) updated++; else skipped++;
      } else {
        const lines = [rentLine, maintLine, elecLine].filter(Boolean) as DraftLineItem[];
        if (lines.length === 0) { skipped++; continue; }
        const res = await createInvoice({
          scope: input.scope, invoice_type: "rent", flat_id: fi.flat_id, tenant_id: tenantRow?.id ?? null,
          agreement_id: ag?.id ?? null, billing_period: period, issue_date: issueDate, due_date: dueDate, lines, created_by: input.created_by ?? null,
        });
        if (res.success) {
          created++;
          invoiceIds.push(res.invoiceId!);
          if (elecLine?.meter_reading_id) await supabaseAdmin.from("meter_readings").update({ invoice_id: res.invoiceId }).eq("id", elecLine.meter_reading_id);
        } else if (res.code === "DUPLICATE") skipped++;
        else errors.push({ ref: fi.flat_id, message: res.error });
      }
    } catch (e) {
      errors.push({ ref: fi.flat_id, message: e instanceof Error ? e.message : String(e) });
    }
  }

  const { data: run } = await supabaseAdmin.from("invoice_runs").insert({
    invoice_type: "rent", billing_period: period,
    scope_society: input.scope.kind === "society" ? input.scope.societyId : null,
    scope_landlord: input.scope.kind === "landlord" ? input.scope.landlordId : null,
    trigger: input.trigger ?? "manual", count_created: created + updated, count_skipped: skipped, errors,
    finished_at: new Date().toISOString(),
  }).select("id").single();

  return { created, updated, skipped, errors, runId: run?.id ?? null, invoiceIds };
}

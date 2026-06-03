/**
 * Meter master, reading sheet, and electricity invoice generation (§5, §24).
 * Server-side (service-role). Electricity is GST-exempt per requirement.
 */

import { supabaseAdmin } from "../supabase-admin";
import type { BillerScope } from "./scope";
import { scopeColumn } from "./scope";
import { getActiveChargeRate, priceConsumption } from "./rates";
import { allocateCommon, type AllocFlat, type AllocMethod } from "./allocation";
import { createInvoice } from "./invoice-service";
import type { DraftLineItem } from "./types";
import { round2, formatINR } from "./money";

// ─── METER CRUD ───────────────────────────────────────────────

export async function listMeters(scope: BillerScope) {
  const { column, value } = scopeColumn(scope);
  const { data } = await supabaseAdmin
    .from("meters").select("*").eq(column, value).eq("is_active", true).order("created_at");
  return data ?? [];
}

export async function createMeter(scope: BillerScope, input: {
  flat_id?: string | null; scope?: "unit" | "common"; meter_number?: string;
  meter_type?: string; unit_label?: string; initial_reading?: number;
}) {
  const scopeCols = scope.kind === "society"
    ? { society_id: scope.societyId, landlord_id: null }
    : { society_id: null, landlord_id: scope.landlordId };
  const { data, error } = await supabaseAdmin.from("meters").insert({
    ...scopeCols,
    flat_id: input.flat_id ?? null,
    scope: input.scope ?? (input.flat_id ? "unit" : "common"),
    meter_number: input.meter_number ?? null,
    meter_type: input.meter_type ?? "electricity",
    unit_label: input.unit_label ?? "kWh",
    initial_reading: input.initial_reading ?? 0,
  }).select("id").single();
  if (error) return { success: false as const, error: error.message };
  return { success: true as const, meterId: data.id };
}

// ─── READING SHEET ────────────────────────────────────────────

/** Meters with their previous reading prefilled for a period (UI reading grid). */
export async function getReadingSheet(scope: BillerScope, period: string) {
  const meters = await listMeters(scope);
  const out = [];
  for (const m of meters) {
    // previous = this period's existing reading's previous, else last reading's current, else initial.
    const { data: thisPeriod } = await supabaseAdmin
      .from("meter_readings").select("id, current_reading, previous_reading, units_consumed, is_meter_reset")
      .eq("meter_id", m.id).eq("billing_period", period).maybeSingle();
    let previous = m.initial_reading ?? 0;
    if (!thisPeriod) {
      const { data: last } = await supabaseAdmin
        .from("meter_readings").select("current_reading")
        .eq("meter_id", m.id).lt("billing_period", period)
        .order("billing_period", { ascending: false }).limit(1).maybeSingle();
      if (last) previous = last.current_reading;
    } else {
      previous = thisPeriod.previous_reading;
    }
    out.push({ meter: m, period, previous_reading: previous, existing: thisPeriod ?? null });
  }
  return out;
}

export async function upsertReading(input: {
  meter_id: string; billing_period: string; current_reading: number;
  previous_reading?: number; is_meter_reset?: boolean; reading_by?: string | null;
}) {
  // resolve previous if not provided
  let previous = input.previous_reading;
  if (previous == null) {
    const { data: last } = await supabaseAdmin
      .from("meter_readings").select("current_reading")
      .eq("meter_id", input.meter_id).lt("billing_period", input.billing_period)
      .order("billing_period", { ascending: false }).limit(1).maybeSingle();
    if (last) previous = last.current_reading;
    else {
      const { data: meter } = await supabaseAdmin.from("meters").select("initial_reading").eq("id", input.meter_id).maybeSingle();
      previous = meter?.initial_reading ?? 0;
    }
  }
  const { data, error } = await supabaseAdmin.from("meter_readings").upsert({
    meter_id: input.meter_id,
    billing_period: input.billing_period,
    current_reading: input.current_reading,
    previous_reading: previous,
    is_meter_reset: input.is_meter_reset ?? false,
    reading_by: input.reading_by ?? null,
  }, { onConflict: "meter_id,billing_period" }).select("id, units_consumed").single();
  if (error) return { success: false as const, error: error.message };
  return { success: true as const, readingId: data.id, units_consumed: data.units_consumed };
}

// ─── ELECTRICITY GENERATION ──────────────────────────────────

export type ElectricityResult = { created: number; skipped: number; errors: { ref: string; message: string }[]; runId: string | null };

export async function generateElectricityForPeriod(input: {
  scope: BillerScope; billing_period: string; due_day?: number; created_by?: string | null; trigger?: "manual" | "cron";
}): Promise<ElectricityResult> {
  const period = input.billing_period;
  const issueDate = `${period}-01`;
  const dueDate = `${period}-${String(input.due_day ?? 5).padStart(2, "0")}`;
  const unitLabel = "kWh";
  const errors: ElectricityResult["errors"] = [];

  const rate = await getActiveChargeRate(input.scope, "electricity", issueDate);
  if (!rate) {
    return { created: 0, skipped: 0, errors: [{ ref: "rate", message: "No electricity rate configured." }], runId: null };
  }

  const meters = await listMeters(input.scope);
  const elecMeters = meters.filter((m) => m.meter_type === "electricity");

  // flat_id → lines to bill
  const flatLines = new Map<string, DraftLineItem[]>();
  const unitReadingByFlat = new Map<string, string>();

  // 1. Unit meters
  for (const m of elecMeters.filter((x) => x.scope === "unit" && x.flat_id)) {
    const { data: reading } = await supabaseAdmin
      .from("meter_readings").select("id, units_consumed, invoice_id")
      .eq("meter_id", m.id).eq("billing_period", period).maybeSingle();
    if (!reading || reading.invoice_id) continue; // no reading or already billed
    const units = Number(reading.units_consumed) || 0;
    if (units <= 0) continue;
    const amount = priceConsumption(rate, units);
    const line: DraftLineItem = {
      description: `Electricity — ${units} ${unitLabel} (${formatINR(amount)})`,
      unit_rate: amount, quantity: 1, gst_applicable: false, hsn_sac: "9969",
      meter_reading_id: reading.id, line_kind: "base",
    };
    const arr = flatLines.get(m.flat_id!) ?? [];
    arr.push(line);
    flatLines.set(m.flat_id!, arr);
    unitReadingByFlat.set(m.flat_id!, reading.id);
  }

  // 2. Common meters → allocate to flats
  for (const m of elecMeters.filter((x) => x.scope === "common")) {
    const { data: reading } = await supabaseAdmin
      .from("meter_readings").select("id, units_consumed").eq("meter_id", m.id).eq("billing_period", period).maybeSingle();
    if (!reading) continue;
    const { data: cfg } = await supabaseAdmin
      .from("common_meter_config").select("id, allocation_method, scope, scope_value").eq("meter_id", m.id).maybeSingle();
    const method = (cfg?.allocation_method ?? "equal") as AllocMethod;

    // beneficiary flats
    const societyId = input.scope.kind === "society" ? input.scope.societyId : null;
    let flatQ = supabaseAdmin.from("flats").select("id, area_sqft, current_tenant_id, block, floor_number");
    flatQ = input.scope.kind === "society" ? flatQ.eq("society_id", societyId!) : flatQ.eq("owner_id", input.scope.landlordId);
    if (cfg?.scope === "block" && cfg.scope_value) flatQ = flatQ.eq("block", cfg.scope_value);
    if (cfg?.scope === "floor" && cfg.scope_value) flatQ = flatQ.eq("floor_number", Number(cfg.scope_value));
    const { data: benFlats } = await flatQ;
    let flats = benFlats ?? [];

    // custom weights
    let weightMap = new Map<string, number>();
    if (method === "custom_weight" && cfg) {
      const { data: w } = await supabaseAdmin.from("common_meter_weights").select("flat_id, weight").eq("common_meter_config_id", cfg.id);
      weightMap = new Map((w ?? []).map((x) => [x.flat_id, Number(x.weight)]));
      if (weightMap.size) flats = flats.filter((f) => weightMap.has(f.id));
    }
    if (flats.length === 0) continue;

    // total units (submeter_diff = common − Σ unit consumption for period)
    let commonUnits = Number(reading.units_consumed) || 0;
    if (method === "submeter_diff") {
      const unitMeterIds = elecMeters.filter((x) => x.scope === "unit").map((x) => x.id);
      if (unitMeterIds.length) {
        const { data: ur } = await supabaseAdmin
          .from("meter_readings").select("units_consumed").in("meter_id", unitMeterIds).eq("billing_period", period);
        const sumUnits = (ur ?? []).reduce((a, r) => a + (Number(r.units_consumed) || 0), 0);
        commonUnits = Math.max(commonUnits - sumUnits, 0);
      }
    }
    if (commonUnits <= 0) continue;

    const commonAmount = priceConsumption(rate, commonUnits);
    const allocFlats: AllocFlat[] = flats.map((f) => ({
      flat_id: f.id, area_sqft: f.area_sqft, occupancy: f.current_tenant_id ? 1 : 0, weight: weightMap.get(f.id) ?? 1,
    }));
    const shares = allocateCommon(method, commonAmount, allocFlats);
    for (const s of shares) {
      if (s.share <= 0) continue;
      const arr = flatLines.get(s.flat_id) ?? [];
      arr.push({
        description: `Common Area Electricity — ${method.replace("_", " ")} share (${commonUnits} ${unitLabel} total)`,
        unit_rate: round2(s.share), quantity: 1, gst_applicable: false, hsn_sac: "9969", line_kind: "common_area",
      });
      flatLines.set(s.flat_id, arr);
    }
  }

  // 3. Create one electricity invoice per flat
  let created = 0;
  let skipped = 0;
  for (const [flatId, lines] of flatLines) {
    try {
      const { data: tenantRow } = await supabaseAdmin
        .from("tenants").select("id").eq("flat_id", flatId).eq("status", "active").limit(1).maybeSingle();
      const res = await createInvoice({
        scope: input.scope,
        invoice_type: "electricity",
        flat_id: flatId,
        tenant_id: tenantRow?.id ?? null,
        billing_period: period,
        issue_date: issueDate,
        due_date: dueDate,
        lines,
        created_by: input.created_by ?? null,
      });
      if (res.success) {
        created++;
        const readingId = unitReadingByFlat.get(flatId);
        if (readingId) await supabaseAdmin.from("meter_readings").update({ invoice_id: res.invoiceId }).eq("id", readingId);
      } else if (res.code === "DUPLICATE") skipped++;
      else errors.push({ ref: flatId, message: res.error });
    } catch (e) {
      errors.push({ ref: flatId, message: e instanceof Error ? e.message : String(e) });
    }
  }

  const { data: run } = await supabaseAdmin.from("invoice_runs").insert({
    invoice_type: "electricity", billing_period: period,
    scope_society: input.scope.kind === "society" ? input.scope.societyId : null,
    scope_landlord: input.scope.kind === "landlord" ? input.scope.landlordId : null,
    trigger: input.trigger ?? "manual", count_created: created, count_skipped: skipped,
    errors, finished_at: new Date().toISOString(),
  }).select("id").single();

  return { created, skipped, errors, runId: run?.id ?? null };
}

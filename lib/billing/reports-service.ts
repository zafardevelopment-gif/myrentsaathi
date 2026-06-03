/**
 * Billing reports + GST returns (§15, §28). Reads the Phase 11 views,
 * scoped to the biller. Aggregation done in TS for flexibility.
 */

import { supabaseAdmin } from "../supabase-admin";
import { scopeColumn, type BillerScope } from "./scope";
import { round2 } from "./money";

function col(scope: BillerScope) { return scopeColumn(scope); }

export async function outstandingReport(scope: BillerScope) {
  const { column, value } = col(scope);
  const { data } = await supabaseAdmin
    .from("invoices")
    .select("id, invoice_number, invoice_type, flat_id, recipient_user_id, total_amount, amount_paid, due_date, status")
    .eq(column, value).neq("status", "cancelled");
  const rows = (data ?? []).map((i) => ({ ...i, outstanding: round2(Number(i.total_amount) - Number(i.amount_paid)) }))
    .filter((i) => i.outstanding > 0);
  const total = round2(rows.reduce((a, r) => a + r.outstanding, 0));
  return { total, count: rows.length, rows };
}

export async function collectionReport(scope: BillerScope, period?: string) {
  const { column, value } = col(scope);
  let q = supabaseAdmin.from("v_collection").select("*").eq(column, value);
  if (period) q = q.eq("period", period);
  const { data } = await q;
  const rows = data ?? [];
  const total = round2(rows.reduce((a, r) => a + Number(r.amount), 0));
  const byMethod: Record<string, number> = {};
  for (const r of rows) byMethod[r.method] = round2((byMethod[r.method] ?? 0) + Number(r.amount));
  return { total, byMethod, count: rows.length };
}

export async function revenueReport(scope: BillerScope) {
  const { column, value } = col(scope);
  const { data } = await supabaseAdmin
    .from("invoices").select("billing_period, invoice_type, total_amount, amount_paid")
    .eq(column, value).neq("status", "cancelled");
  const byPeriod: Record<string, { billed: number; collected: number }> = {};
  for (const i of data ?? []) {
    const p = i.billing_period ?? "—";
    byPeriod[p] = byPeriod[p] ?? { billed: 0, collected: 0 };
    byPeriod[p].billed = round2(byPeriod[p].billed + Number(i.total_amount));
    byPeriod[p].collected = round2(byPeriod[p].collected + Number(i.amount_paid));
  }
  return { byPeriod };
}

export async function partyLedger(scope: BillerScope, recipientUserId?: string) {
  const { value } = col(scope);
  let q = supabaseAdmin.from("v_party_ledger").select("*").eq("biller", value);
  if (recipientUserId) q = q.eq("recipient_user_id", recipientUserId);
  const { data } = await q;
  const rows = (data ?? []).sort((a, b) => String(a.entry_date).localeCompare(String(b.entry_date)));
  let balance = 0;
  const ledger = rows.map((r) => { balance = round2(balance + Number(r.amount)); return { ...r, balance }; });
  return { ledger, balance };
}

export async function consumptionReport(scope: BillerScope, period?: string) {
  const meters = await supabaseAdmin.from("meters").select("id, flat_id, meter_number, unit_label")
    .eq(scope.kind === "society" ? "society_id" : "landlord_id", scope.kind === "society" ? scope.societyId : scope.landlordId);
  const meterIds = (meters.data ?? []).map((m) => m.id);
  if (!meterIds.length) return { rows: [] };
  let q = supabaseAdmin.from("meter_readings").select("meter_id, billing_period, units_consumed, current_reading, previous_reading").in("meter_id", meterIds);
  if (period) q = q.eq("billing_period", period);
  const { data } = await q;
  return { rows: data ?? [] };
}

// ─── GST RETURNS ─────────────────────────────────────────────

export async function gstr1(scope: BillerScope, period: string) {
  const { column, value } = col(scope);
  const { data: lines } = await supabaseAdmin
    .from("v_gst_lines").select("*").eq(column, value).eq("period", period);
  const rows = lines ?? [];

  const acc = (key: string, map: Map<string, { taxable: number; cgst: number; sgst: number; igst: number }>, r: typeof rows[number]) => {
    const e = map.get(key) ?? { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
    e.taxable = round2(e.taxable + Number(r.taxable_value));
    e.cgst = round2(e.cgst + Number(r.cgst_amount));
    e.sgst = round2(e.sgst + Number(r.sgst_amount));
    e.igst = round2(e.igst + Number(r.igst_amount));
    map.set(key, e);
  };

  const b2b = new Map<string, { taxable: number; cgst: number; sgst: number; igst: number }>();
  const b2cs = new Map<string, { taxable: number; cgst: number; sgst: number; igst: number }>();
  const hsn = new Map<string, { taxable: number; cgst: number; sgst: number; igst: number }>();
  for (const r of rows) {
    if (r.recipient_gst) acc(`${r.recipient_gst}|${r.gst_percent}`, b2b, r);
    else acc(`${r.place_of_supply ?? "NA"}|${r.gst_percent}`, b2cs, r);
    acc(`${r.hsn_sac ?? "NA"}|${r.gst_percent}`, hsn, r);
  }

  // CDNR (credit/debit notes) — view may be absent if Phase 9 not applied.
  let cdnr: { note_number: string; note_type: string; taxable: number; tax: number }[] = [];
  try {
    const { data: notes } = await supabaseAdmin.from("v_gst_note_lines").select("*").eq(column, value).eq("period", period);
    cdnr = (notes ?? []).map((n) => ({ note_number: n.note_number, note_type: n.note_type,
      taxable: Number(n.taxable_value), tax: Number(n.gst_amount) }));
  } catch { /* notes view absent */ }

  const toArr = (m: Map<string, { taxable: number; cgst: number; sgst: number; igst: number }>) =>
    [...m.entries()].map(([k, v]) => ({ key: k, ...v }));
  return { period, b2b: toArr(b2b), b2cs: toArr(b2cs), hsn: toArr(hsn), cdnr };
}

export async function gstr3b(scope: BillerScope, period: string) {
  const { column, value } = col(scope);
  const { data: lines } = await supabaseAdmin.from("v_gst_lines").select("*").eq(column, value).eq("period", period);
  let taxable = 0, cgst = 0, sgst = 0, igst = 0;
  for (const r of lines ?? []) {
    taxable = round2(taxable + Number(r.taxable_value));
    cgst = round2(cgst + Number(r.cgst_amount));
    sgst = round2(sgst + Number(r.sgst_amount));
    igst = round2(igst + Number(r.igst_amount));
  }
  // Net credit notes
  try {
    const { data: notes } = await supabaseAdmin.from("v_gst_note_lines").select("*").eq(column, value).eq("period", period);
    for (const n of notes ?? []) {
      const sign = n.note_type === "credit" ? -1 : 1;
      taxable = round2(taxable + sign * Number(n.taxable_value));
      cgst = round2(cgst + sign * Number(n.cgst_amount));
      sgst = round2(sgst + sign * Number(n.sgst_amount));
      igst = round2(igst + sign * Number(n.igst_amount));
    }
  } catch { /* notes view absent */ }
  return { period, taxable_outward: taxable, cgst, sgst, igst, total_tax: round2(cgst + sgst + igst) };
}

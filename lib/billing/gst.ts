/**
 * GST engine — editable/versioned rate resolution (§3.1) and the
 * CGST/SGST vs IGST split by place of supply (§3.2).
 *
 * The split is a PURE function (unit-testable). Rate resolution reads
 * the versioned gst_rate_config and is scope-aware (biller override →
 * platform default).
 */

import { supabase } from "../supabase";
import { round2 } from "./money";
import type { BillerScope } from "./scope";
import { scopeColumn } from "./scope";
import type { DraftLineItem, ComputedLineItem, InvoiceTotals } from "./types";

// ─── FINANCIAL YEAR ───────────────────────────────────────────

/** Indian financial year for a date, e.g. 2026-05-01 → "2026-27". FY starts 1 April. */
export function financialYear(date: Date = new Date()): string {
  const y = date.getFullYear();
  const startYear = date.getMonth() + 1 >= 4 ? y : y - 1; // months are 0-indexed
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
}

// ─── RATE RESOLUTION (versioned, scope-aware) ────────────────

export type GstRate = { rate_percent: number; cgst_percent: number; sgst_percent: number };

/**
 * Resolve the GST rate in force for `appliesTo` on `issueDate`.
 * Precedence: biller-specific active row → platform default → 0% (none).
 */
export async function getActiveGstRate(
  scope: BillerScope,
  appliesTo: string,
  issueDate: string, // 'YYYY-MM-DD'
): Promise<GstRate> {
  // 1. biller-specific
  const { column, value } = scopeColumn(scope);
  const biller = await supabase
    .from("gst_rate_config")
    .select("rate_percent, cgst_percent, sgst_percent")
    .eq(column, value)
    .eq("applies_to", appliesTo)
    .eq("is_active", true)
    .lte("effective_from", issueDate)
    .or(`effective_to.is.null,effective_to.gte.${issueDate}`)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (biller.data) return biller.data as GstRate;

  // 2. platform default (society_id IS NULL AND landlord_id IS NULL)
  const platform = await supabase
    .from("gst_rate_config")
    .select("rate_percent, cgst_percent, sgst_percent")
    .is("society_id", null)
    .is("landlord_id", null)
    .eq("applies_to", appliesTo)
    .eq("is_active", true)
    .lte("effective_from", issueDate)
    .or(`effective_to.is.null,effective_to.gte.${issueDate}`)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (platform.data) return platform.data as GstRate;

  // 3. none configured
  return { rate_percent: 0, cgst_percent: 0, sgst_percent: 0 };
}

// ─── THE SPLIT (pure) ─────────────────────────────────────────

export type GstSplit = { cgst: number; sgst: number; igst: number; total: number };

/**
 * Split a GST amount into CGST+SGST (intra-state) or IGST (inter-state).
 * Intra-state when biller and place-of-supply states match.
 * Returns zeros when no states are known and rate is 0.
 */
export function splitGst(
  taxableAmount: number,
  ratePercent: number,
  billerState: string | null | undefined,
  placeOfSupply: string | null | undefined,
): GstSplit {
  if (!ratePercent || taxableAmount <= 0) return { cgst: 0, sgst: 0, igst: 0, total: 0 };

  const gst = round2((taxableAmount * ratePercent) / 100);

  // Inter-state only when BOTH states are known and differ. Default to intra-state
  // (CGST+SGST) — the common case for renting immovable property (§3.2).
  const interState = !!billerState && !!placeOfSupply && billerState !== placeOfSupply;

  if (interState) return { cgst: 0, sgst: 0, igst: gst, total: gst };
  const half = round2(gst / 2);
  // Put any rounding remainder on CGST so cgst+sgst === gst exactly.
  return { cgst: round2(gst - half), sgst: half, igst: 0, total: gst };
}

// ─── LINE & INVOICE COMPUTATION ──────────────────────────────

/**
 * Compute a single line item's totals + tax split.
 * `rate` is the resolved GST rate (already snapshotted for this invoice);
 * `gst_percent` on the draft, if provided, overrides the resolved rate.
 */
export function computeLine(
  draft: DraftLineItem,
  rate: GstRate,
  billerState: string | null | undefined,
  placeOfSupply: string | null | undefined,
): ComputedLineItem {
  const quantity = draft.quantity ?? 1;
  const line_total = round2(quantity * draft.unit_rate);
  const gst_applicable = draft.gst_applicable ?? false;
  const effectiveRate = gst_applicable ? (draft.gst_percent ?? rate.rate_percent) : 0;

  const split = gst_applicable
    ? splitGst(line_total, effectiveRate, billerState, placeOfSupply)
    : { cgst: 0, sgst: 0, igst: 0, total: 0 };

  const isInter = split.igst > 0;
  return {
    line_kind: draft.line_kind ?? "base",
    charge_type_id: draft.charge_type_id ?? null,
    description: draft.description,
    hsn_sac: draft.hsn_sac ?? null,
    quantity,
    unit_rate: draft.unit_rate,
    line_total,
    gst_applicable,
    gst_percent: effectiveRate,
    gst_amount: split.total,
    cgst_percent: !isInter && gst_applicable ? round2(effectiveRate / 2) : 0,
    cgst_amount: split.cgst,
    sgst_percent: !isInter && gst_applicable ? round2(effectiveRate / 2) : 0,
    sgst_amount: split.sgst,
    igst_percent: isInter ? effectiveRate : 0,
    igst_amount: split.igst,
    meter_reading_id: draft.meter_reading_id ?? null,
    sort_order: draft.sort_order ?? 0,
  };
}

/** Aggregate computed lines into invoice header totals. */
export function computeTotals(lines: ComputedLineItem[]): InvoiceTotals {
  const sub_total = round2(lines.reduce((a, l) => a + l.line_total, 0));
  const cgst_total = round2(lines.reduce((a, l) => a + l.cgst_amount, 0));
  const sgst_total = round2(lines.reduce((a, l) => a + l.sgst_amount, 0));
  const igst_total = round2(lines.reduce((a, l) => a + l.igst_amount, 0));
  const gst_amount = round2(cgst_total + sgst_total + igst_total);
  // Dominant rate for header display (the highest line rate present).
  const gst_percent = lines.reduce((m, l) => Math.max(m, l.gst_percent), 0);
  return {
    sub_total,
    cgst_total,
    sgst_total,
    igst_total,
    gst_amount,
    total_amount: round2(sub_total + gst_amount),
    gst_percent,
    gst_breakup: { cgst: cgst_total, sgst: sgst_total, igst: igst_total },
  };
}

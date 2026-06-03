/**
 * Shared billing types. Mirror the Phase 2 schema
 * (docs/billing-invoice-module-design.md §7).
 */

export type InvoiceType = "rent" | "maintenance" | "electricity" | "charges";
export type DocType = InvoiceType | "credit_note" | "debit_note";
export type RecipientType = "tenant" | "owner" | "landlord";
export type LineKind = "base" | "charge" | "late_fee" | "common_area" | "adjustment";
export type InvoiceStatus = "draft" | "unpaid" | "partially_paid" | "paid" | "overdue" | "cancelled";
export type PaymentMethod = "cash" | "upi" | "bank" | "razorpay" | "payment_link" | "cheque" | "deposit_adjustment";

/** A line item before tax is computed (what a generator produces). */
export type DraftLineItem = {
  line_kind?: LineKind;
  charge_type_id?: string | null;
  description: string;
  hsn_sac?: string | null;
  quantity?: number;
  unit_rate: number;
  gst_applicable?: boolean;
  gst_percent?: number; // effective rate to apply when gst_applicable
  meter_reading_id?: string | null;
  sort_order?: number;
};

/** A line item after the CGST/SGST/IGST split is computed. */
export type ComputedLineItem = Required<
  Pick<DraftLineItem, "description" | "unit_rate">
> & {
  line_kind: LineKind;
  charge_type_id: string | null;
  hsn_sac: string | null;
  quantity: number;
  line_total: number;
  gst_applicable: boolean;
  gst_percent: number;
  gst_amount: number;
  cgst_percent: number;
  cgst_amount: number;
  sgst_percent: number;
  sgst_amount: number;
  igst_percent: number;
  igst_amount: number;
  meter_reading_id: string | null;
  sort_order: number;
};

/** Aggregated money totals for an invoice header. */
export type InvoiceTotals = {
  sub_total: number;
  cgst_total: number;
  sgst_total: number;
  igst_total: number;
  gst_amount: number;
  total_amount: number;
  gst_percent: number; // dominant/effective rate for display
  gst_breakup: { cgst: number; sgst: number; igst: number };
};

/**
 * Credit / debit notes (§22). Adjust an already-issued invoice instead of
 * editing it. Numbered via the shared invoice_series (CRN/DBN). Reuses the
 * same GST split engine so returns net correctly.
 */

import { supabaseAdmin } from "../supabase-admin";
import { financialYear, getActiveGstRate, computeLine, computeTotals } from "./gst";
import type { BillerScope } from "./scope";
import type { DraftLineItem } from "./types";

export type CreateNoteInput = {
  invoice_id: string;
  note_type: "credit" | "debit";
  reason?: string;
  lines: DraftLineItem[];
  created_by?: string | null;
};

export async function createNote(input: CreateNoteInput): Promise<{ success: boolean; error?: string; noteId?: string; noteNumber?: string }> {
  // Load the original invoice for snapshots + scope.
  const { data: inv } = await supabaseAdmin
    .from("invoices")
    .select("id, society_id, landlord_id, flat_id, recipient_type, recipient_user_id, biller_gst, recipient_gst, place_of_supply, issue_date")
    .eq("id", input.invoice_id).maybeSingle();
  if (!inv) return { success: false, error: "Original invoice not found" };

  const scope: BillerScope = inv.society_id
    ? { kind: "society", societyId: inv.society_id }
    : { kind: "landlord", landlordId: inv.landlord_id as string };

  const issueDate = new Date().toISOString().slice(0, 10);
  const rate = await getActiveGstRate(scope, "rent", issueDate);
  const computed = input.lines.map((l) => computeLine(l, rate, null, inv.place_of_supply));
  const totals = computeTotals(computed);

  // Number via the shared series (CRN/DBN).
  const docType = input.note_type === "credit" ? "credit_note" : "debit_note";
  const prefix = input.note_type === "credit" ? "CRN" : "DBN";
  const { data: number, error: numErr } = await supabaseAdmin.rpc("next_doc_number", {
    p_society: inv.society_id, p_landlord: inv.landlord_id, p_doc_type: docType,
    p_fy: financialYear(new Date(issueDate)), p_prefix: prefix,
  });
  if (numErr || !number) return { success: false, error: numErr?.message ?? "Numbering failed" };

  const { data: note, error } = await supabaseAdmin.from("adjustment_notes").insert({
    note_number: number, note_type: input.note_type, invoice_id: inv.id,
    society_id: inv.society_id, landlord_id: inv.landlord_id, flat_id: inv.flat_id,
    recipient_type: inv.recipient_type, recipient_user_id: inv.recipient_user_id,
    reason: input.reason ?? null,
    sub_total: totals.sub_total, gst_percent: totals.gst_percent, gst_amount: totals.gst_amount,
    cgst_total: totals.cgst_total, sgst_total: totals.sgst_total, igst_total: totals.igst_total,
    gst_breakup: totals.gst_breakup, total_amount: totals.total_amount,
    biller_gst: inv.biller_gst, recipient_gst: inv.recipient_gst, place_of_supply: inv.place_of_supply,
    created_by: input.created_by ?? null,
  }).select("id").single();
  if (error || !note) return { success: false, error: error?.message ?? "Failed to create note" };

  if (computed.length) {
    await supabaseAdmin.from("adjustment_note_items").insert(computed.map((c, i) => ({
      note_id: note.id, description: c.description, hsn_sac: c.hsn_sac, quantity: c.quantity,
      unit_rate: c.unit_rate, line_total: c.line_total, gst_applicable: c.gst_applicable,
      gst_percent: c.gst_percent, gst_amount: c.gst_amount,
      cgst_amount: c.cgst_amount, sgst_amount: c.sgst_amount, igst_amount: c.igst_amount, sort_order: i,
    })));
  }
  return { success: true, noteId: note.id, noteNumber: number as string };
}

/** Cancel an issued invoice by raising a full-value credit note (§22). Never deletes the invoice. */
export async function cancelInvoiceWithCreditNote(invoiceId: string, reason: string, createdBy?: string | null) {
  const { data: inv } = await supabaseAdmin
    .from("invoices").select("sub_total, gst_percent, invoice_number").eq("id", invoiceId).maybeSingle();
  if (!inv) return { success: false as const, error: "Invoice not found" };
  const res = await createNote({
    invoice_id: invoiceId, note_type: "credit", reason,
    lines: [{ description: `Cancellation of ${inv.invoice_number}`, unit_rate: Number(inv.sub_total), quantity: 1,
      gst_applicable: Number(inv.gst_percent) > 0, gst_percent: Number(inv.gst_percent) }],
    created_by: createdBy,
  });
  if (res.success) {
    await supabaseAdmin.from("invoices").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", invoiceId);
  }
  return res;
}

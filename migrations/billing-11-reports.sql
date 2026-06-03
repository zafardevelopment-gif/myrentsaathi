-- ============================================================
-- BILLING MODULE — PHASE 11: Reporting & GST return views
-- Run after billing-02 (and ideally 09). Idempotent.
-- Design ref: docs/billing-invoice-module-design.md §15, §28
-- ============================================================

-- GST-applicable invoice lines flattened with header context (for GSTR-1/3B).
CREATE OR REPLACE VIEW public.v_gst_lines AS
SELECT
  li.id                          AS line_id,
  i.id                           AS invoice_id,
  i.invoice_number,
  i.invoice_type,
  i.issue_date,
  to_char(i.issue_date, 'YYYY-MM') AS period,
  i.society_id, i.landlord_id,
  COALESCE(i.society_id, i.landlord_id) AS biller,
  i.recipient_gst,
  i.place_of_supply,
  li.hsn_sac,
  li.gst_percent,
  li.line_total                  AS taxable_value,
  li.cgst_amount, li.sgst_amount, li.igst_amount, li.gst_amount
FROM public.invoice_line_items li
JOIN public.invoices i ON i.id = li.invoice_id
WHERE i.status <> 'cancelled' AND li.gst_applicable = true;

-- Credit/debit note lines (CDNR) — only when the adjustment_notes table exists.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'adjustment_notes') THEN
    EXECUTE $v$
      CREATE OR REPLACE VIEW public.v_gst_note_lines AS
      SELECT
        ni.id AS line_id, n.id AS note_id, n.note_number, n.note_type,
        n.created_at::date AS issue_date, to_char(n.created_at, 'YYYY-MM') AS period,
        n.society_id, n.landlord_id, COALESCE(n.society_id, n.landlord_id) AS biller,
        n.recipient_gst, n.place_of_supply, ni.hsn_sac, ni.gst_percent,
        ni.line_total AS taxable_value, ni.cgst_amount, ni.sgst_amount, ni.igst_amount, ni.gst_amount
      FROM public.adjustment_note_items ni
      JOIN public.adjustment_notes n ON n.id = ni.note_id
      WHERE n.status = 'issued' AND ni.gst_applicable = true;
    $v$;
  END IF;
END $$;

-- Collection (confirmed payments) with header context.
CREATE OR REPLACE VIEW public.v_collection AS
SELECT
  p.id AS payment_id, p.payment_date, to_char(p.payment_date, 'YYYY-MM') AS period,
  p.amount, p.method, i.id AS invoice_id, i.invoice_type, i.flat_id,
  i.society_id, i.landlord_id, COALESCE(i.society_id, i.landlord_id) AS biller
FROM public.invoice_payments p
JOIN public.invoices i ON i.id = p.invoice_id
WHERE p.status = 'confirmed';

-- Done. Phase 11 views: v_gst_lines, v_gst_note_lines, v_collection (+ v_invoice_outstanding from Phase 2).

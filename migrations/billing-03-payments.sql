-- ============================================================
-- BILLING MODULE — PHASE 3: Payment status engine
-- Run AFTER billing-02-invoices.sql. Idempotent.
--
-- A trigger keeps invoices.amount_paid + status in sync whenever a
-- confirmed payment is inserted/updated/deleted — so manual entry,
-- Razorpay webhook (Phase 10) and deposit adjustments (Phase 9) all
-- reconcile identically. Plus a mark-overdue function for the cron.
--
-- Design ref: docs/billing-invoice-module-design.md §7 (status engine), §11
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- 1. Recompute trigger
--    status precedence: paid → overdue (past due & not fully paid)
--                       → partially_paid → unpaid.
--    'draft' and 'cancelled' invoices: amount_paid updated, status untouched.
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_recompute_invoice_payment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice uuid;
  v_paid    numeric;
  v_total   numeric;
  v_status  text;
  v_due     date;
BEGIN
  v_invoice := COALESCE(NEW.invoice_id, OLD.invoice_id);

  SELECT total_amount, due_date, status
    INTO v_total, v_due, v_status
  FROM public.invoices WHERE id = v_invoice;

  SELECT COALESCE(SUM(amount), 0)
    INTO v_paid
  FROM public.invoice_payments
  WHERE invoice_id = v_invoice AND status = 'confirmed';

  IF v_status IN ('draft', 'cancelled') THEN
    UPDATE public.invoices SET amount_paid = v_paid, updated_at = now() WHERE id = v_invoice;
    RETURN NULL;
  END IF;

  IF v_total > 0 AND v_paid >= v_total THEN
    v_status := 'paid';
  ELSIF v_due IS NOT NULL AND v_due < current_date THEN
    v_status := 'overdue';            -- past due & not fully paid (covers partial+overdue)
  ELSIF v_paid > 0 THEN
    v_status := 'partially_paid';
  ELSE
    v_status := 'unpaid';
  END IF;

  UPDATE public.invoices
     SET amount_paid = v_paid, status = v_status, updated_at = now()
   WHERE id = v_invoice;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_payments_recompute ON public.payments;
CREATE TRIGGER trg_payments_recompute
  AFTER INSERT OR UPDATE OR DELETE ON public.invoice_payments
  FOR EACH ROW EXECUTE FUNCTION public.fn_recompute_invoice_payment();

-- ════════════════════════════════════════════════════════════
-- 2. mark_overdue_invoices() — daily cron uses this (§8 mark-overdue)
--    Flips unpaid/partially_paid past-due invoices to 'overdue'.
--    Returns the number of rows updated.
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.mark_overdue_invoices()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH updated AS (
    UPDATE public.invoices
       SET status = 'overdue', updated_at = now()
     WHERE status IN ('unpaid', 'partially_paid')
       AND due_date IS NOT NULL
       AND due_date < current_date
       AND amount_paid < total_amount
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM updated;
  RETURN v_count;
END;
$$;

-- Done. Phase 3: payment recompute trigger + mark-overdue function in place.

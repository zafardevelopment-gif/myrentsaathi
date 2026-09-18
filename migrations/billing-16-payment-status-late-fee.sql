-- migrations/billing-16-payment-status-late-fee.sql
--
-- Bug fix: invoices.total_amount deliberately does NOT include late_fee_total
-- (see billing-14-late-fees.sql §4 comment + trg_sync_invoice_late_fee_total).
-- But fn_recompute_invoice_payment() (billing-03-payments.sql) marks an
-- invoice 'paid' once amount_paid >= total_amount, ignoring late_fee_total.
-- So a tenant who pays only the base rent — leaving the late fee unpaid —
-- gets flipped to 'paid' and silently disappears from the outstanding
-- report and reminder queue while still owing the late fee.
--
-- Fix: compare amount_paid against (total_amount + late_fee_total) instead.
-- Same for mark_overdue_invoices()'s "not fully paid" check.
--
-- Run AFTER billing-14-late-fees.sql and billing-15-late-fee-rls.sql.
-- Idempotent (CREATE OR REPLACE / DROP+CREATE).

CREATE OR REPLACE FUNCTION public.fn_recompute_invoice_payment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice   uuid;
  v_paid      numeric;
  v_total     numeric;
  v_late_fee  numeric;
  v_due_total numeric;
  v_status    text;
  v_due       date;
BEGIN
  v_invoice := COALESCE(NEW.invoice_id, OLD.invoice_id);

  SELECT total_amount, COALESCE(late_fee_total, 0), due_date, status
    INTO v_total, v_late_fee, v_due, v_status
  FROM public.invoices WHERE id = v_invoice;

  SELECT COALESCE(SUM(amount), 0)
    INTO v_paid
  FROM public.invoice_payments
  WHERE invoice_id = v_invoice AND status = 'confirmed';

  v_due_total := v_total + v_late_fee;

  IF v_status IN ('draft', 'cancelled') THEN
    UPDATE public.invoices SET amount_paid = v_paid, updated_at = now() WHERE id = v_invoice;
    RETURN NULL;
  END IF;

  IF v_due_total > 0 AND v_paid >= v_due_total THEN
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
       AND amount_paid < (total_amount + COALESCE(late_fee_total, 0))
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM updated;
  RETURN v_count;
END;
$$;

-- The invoice_late_fees ledger trigger (trg_sync_invoice_late_fee_total) only
-- updates invoices.late_fee_total — it doesn't re-run the payment-status
-- check above. So when a late fee is applied to an invoice that was already
-- fully paid at the old (lower) total, it must stay/flip to unpaid/overdue.
-- Extend the sync function to also recompute status the same way.
CREATE OR REPLACE FUNCTION public.sync_invoice_late_fee_total()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_invoice uuid := COALESCE(NEW.invoice_id, OLD.invoice_id);
  fee_sum        numeric(12,2);
  v_total        numeric;
  v_paid         numeric;
  v_due          date;
  v_status       text;
  v_due_total    numeric;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO fee_sum
    FROM invoice_late_fees
   WHERE invoice_id = target_invoice;

  SELECT total_amount, amount_paid, due_date, status
    INTO v_total, v_paid, v_due, v_status
  FROM public.invoices WHERE id = target_invoice;

  IF v_status IN ('draft', 'cancelled') THEN
    UPDATE public.invoices SET late_fee_total = fee_sum, updated_at = now() WHERE id = target_invoice;
    RETURN NULL;
  END IF;

  v_due_total := v_total + fee_sum;

  IF v_due_total > 0 AND v_paid >= v_due_total THEN
    v_status := 'paid';
  ELSIF v_due IS NOT NULL AND v_due < current_date THEN
    v_status := 'overdue';
  ELSIF v_paid > 0 THEN
    v_status := 'partially_paid';
  ELSE
    v_status := 'unpaid';
  END IF;

  UPDATE public.invoices
     SET late_fee_total = fee_sum,
         status         = v_status,
         updated_at     = now()
   WHERE id = target_invoice;

  RETURN NULL;
END;
$$;

-- Done. Paid/overdue status now accounts for late_fee_total everywhere it's decided.

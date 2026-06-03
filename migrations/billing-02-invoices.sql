-- ============================================================
-- BILLING MODULE — PHASE 2: Invoice Core
-- Run AFTER billing-00-foundations.sql. Idempotent.
--
-- Unified invoice model: invoices (header) + invoice_line_items
-- + payments + invoice_series (gapless numbering) + invoice_runs
-- (cron audit). Carries the full v2 column set (recipient, GST
-- CGST/SGST/IGST split, template, payment link, late fee) so later
-- phases only add FK targets, not columns.
--
-- Design ref: docs/billing-invoice-module-design.md §7, §3.2, §8, §19
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- 1. invoice_series — gapless numbering per biller+doc_type+FY
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.invoice_series (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id     uuid REFERENCES public.societies(id) ON DELETE CASCADE,
  landlord_id    uuid REFERENCES public.users(id)     ON DELETE CASCADE,
  doc_type       text NOT NULL,   -- 'rent'|'maintenance'|'electricity'|'charges'|'credit_note'|'debit_note'
  financial_year text NOT NULL,   -- '2026-27'
  prefix         text NOT NULL,   -- 'RENT','MNT','ELEC','CHG','CRN','DBN'
  next_seq       integer NOT NULL DEFAULT 1,
  created_at     timestamptz NOT NULL DEFAULT now()
);
-- One counter per (biller, doc_type, FY). coalesce handles society-OR-landlord nullability.
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoice_series_biller
  ON public.invoice_series (COALESCE(society_id, landlord_id), doc_type, financial_year);

-- ════════════════════════════════════════════════════════════
-- 2. invoices — HEADER
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.invoices (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number      text NOT NULL,   -- unique PER BILLER (see uq_invoices_number_per_biller), not globally
  invoice_type        text NOT NULL,   -- 'rent'|'maintenance'|'electricity'|'charges'
  society_id          uuid REFERENCES public.societies(id) ON DELETE SET NULL,
  landlord_id         uuid REFERENCES public.users(id)     ON DELETE SET NULL,
  flat_id             uuid REFERENCES public.flats(id)     ON DELETE SET NULL,
  tenant_id           uuid REFERENCES public.tenants(id)   ON DELETE SET NULL,
  agreement_id        uuid REFERENCES public.agreements(id) ON DELETE SET NULL,
  -- recipient (§19)
  recipient_type      text NOT NULL DEFAULT 'tenant' CHECK (recipient_type IN ('tenant','owner','landlord')),
  recipient_user_id   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  billing_period      text,            -- 'YYYY-MM'
  issue_date          date NOT NULL DEFAULT current_date,
  due_date            date,
  -- money (all snapshots)
  sub_total           numeric NOT NULL DEFAULT 0,
  gst_percent         numeric(5,2) NOT NULL DEFAULT 0,
  gst_amount          numeric NOT NULL DEFAULT 0,
  cgst_total          numeric NOT NULL DEFAULT 0,   -- §3.2 intra-state
  sgst_total          numeric NOT NULL DEFAULT 0,
  igst_total          numeric NOT NULL DEFAULT 0,   -- §3.2 inter-state
  gst_breakup         jsonb,                        -- {cgst,sgst,igst} mirror
  late_fee_total      numeric NOT NULL DEFAULT 0,
  total_amount        numeric NOT NULL DEFAULT 0,
  amount_paid         numeric NOT NULL DEFAULT 0,
  status              text NOT NULL DEFAULT 'unpaid'
                        CHECK (status IN ('draft','unpaid','partially_paid','paid','overdue','cancelled')),
  -- GST identity snapshot (stable re-print)
  biller_gst          text,
  recipient_gst       text,
  place_of_supply     text,            -- state code; intra vs inter-state
  biller_snapshot     jsonb,
  -- presentation & collection (FKs to later-phase tables deferred → plain uuid)
  template_id         uuid,            -- → invoice_templates (Phase 10)
  payment_link_id     text,
  payment_link_url    text,
  payment_link_status text,
  pdf_url             text,
  legacy_ref          text,            -- original rent_payments/maintenance_payments id (§12)
  notes               text,
  created_by          uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invoices_scope    ON public.invoices (COALESCE(society_id, landlord_id));
CREATE INDEX IF NOT EXISTS idx_invoices_recipient ON public.invoices (recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_flat      ON public.invoices (flat_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status    ON public.invoices (status);
CREATE INDEX IF NOT EXISTS idx_invoices_period    ON public.invoices (invoice_type, billing_period);
-- Invoice numbers are unique PER BILLER (per GSTIN), not globally — two billers
-- may each have RENT/2026-27/0001.
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_number_per_biller
  ON public.invoices (COALESCE(society_id, landlord_id), invoice_number);
-- Idempotency for auto-generation: one auto invoice per (flat, type, period).
-- Partial unique so manual ad-hoc invoices (billing_period NULL) are unconstrained.
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_auto
  ON public.invoices (flat_id, invoice_type, billing_period)
  WHERE billing_period IS NOT NULL AND status <> 'cancelled';

-- ════════════════════════════════════════════════════════════
-- 3. invoice_line_items
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  line_kind       text NOT NULL DEFAULT 'base'
                    CHECK (line_kind IN ('base','charge','late_fee','common_area','adjustment')),
  charge_type_id  uuid,            -- → charge_types (Phase 6)
  description     text NOT NULL,
  hsn_sac         text,
  quantity        numeric NOT NULL DEFAULT 1,
  unit_rate       numeric NOT NULL DEFAULT 0,
  line_total      numeric NOT NULL DEFAULT 0,
  gst_applicable  boolean NOT NULL DEFAULT false,
  gst_percent     numeric(5,2) NOT NULL DEFAULT 0,
  gst_amount      numeric NOT NULL DEFAULT 0,
  -- §3.2 split (one branch zero depending on place of supply)
  cgst_percent    numeric(5,2) NOT NULL DEFAULT 0,
  cgst_amount     numeric NOT NULL DEFAULT 0,
  sgst_percent    numeric(5,2) NOT NULL DEFAULT 0,
  sgst_amount     numeric NOT NULL DEFAULT 0,
  igst_percent    numeric(5,2) NOT NULL DEFAULT 0,
  igst_amount     numeric NOT NULL DEFAULT 0,
  meter_reading_id uuid,           -- → meter_readings (Phase 5)
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_line_items_invoice ON public.invoice_line_items (invoice_id);

-- ════════════════════════════════════════════════════════════
-- 4. invoice_payments — one row per money event (full/partial)
--    NOTE: named invoice_payments (not 'payments') to avoid colliding
--    with the app's pre-existing generic `payments` table.
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id        uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount            numeric NOT NULL,
  payment_date      date NOT NULL DEFAULT current_date,
  method            text NOT NULL DEFAULT 'cash'
                      CHECK (method IN ('cash','upi','bank','razorpay','payment_link','cheque','deposit_adjustment')),
  reference         text,
  razorpay_order_id text,
  payment_link_id   text,
  receipt_url       text,
  status            text NOT NULL DEFAULT 'confirmed'
                      CHECK (status IN ('pending_verification','confirmed','rejected')),
  recorded_by       uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON public.invoice_payments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_status  ON public.invoice_payments (status);

-- ════════════════════════════════════════════════════════════
-- 5. invoice_runs — cron/batch audit (§8)
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.invoice_runs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_type   text NOT NULL,
  billing_period text,
  scope_society  uuid,
  scope_landlord uuid,
  trigger        text NOT NULL DEFAULT 'manual',  -- 'manual'|'cron'
  count_created  integer NOT NULL DEFAULT 0,
  count_skipped  integer NOT NULL DEFAULT 0,
  errors         jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at     timestamptz NOT NULL DEFAULT now(),
  finished_at    timestamptz
);

-- ════════════════════════════════════════════════════════════
-- 6. next_doc_number() — atomic, gapless numbering (§7)
--    Increments the series counter and returns 'PREFIX/FY/0001'.
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.next_doc_number(
  p_society  uuid,
  p_landlord uuid,
  p_doc_type text,
  p_fy       text,
  p_prefix   text
) RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_seq integer;
BEGIN
  -- Try to bump an existing counter first (row lock prevents races).
  UPDATE public.invoice_series
     SET next_seq = next_seq + 1
   WHERE COALESCE(society_id, landlord_id) = COALESCE(p_society, p_landlord)
     AND doc_type = p_doc_type
     AND financial_year = p_fy
  RETURNING next_seq INTO v_seq;

  IF NOT FOUND THEN
    -- First document for this series. Unique index guards concurrent inserts.
    BEGIN
      INSERT INTO public.invoice_series (society_id, landlord_id, doc_type, financial_year, prefix, next_seq)
      VALUES (p_society, p_landlord, p_doc_type, p_fy, p_prefix, 1)
      RETURNING next_seq INTO v_seq;
    EXCEPTION WHEN unique_violation THEN
      UPDATE public.invoice_series
         SET next_seq = next_seq + 1
       WHERE COALESCE(society_id, landlord_id) = COALESCE(p_society, p_landlord)
         AND doc_type = p_doc_type
         AND financial_year = p_fy
      RETURNING next_seq INTO v_seq;
    END;
  END IF;

  RETURN p_prefix || '/' || p_fy || '/' || lpad(v_seq::text, 4, '0');
END;
$$;

-- ════════════════════════════════════════════════════════════
-- 7. RLS — open_access (matches existing; tightened in SaaS phase §16)
-- ════════════════════════════════════════════════════════════
ALTER TABLE public.invoice_series     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_runs       ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "open_access" ON public.invoice_series;
CREATE POLICY "open_access" ON public.invoice_series     FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "open_access" ON public.invoices;
CREATE POLICY "open_access" ON public.invoices           FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "open_access" ON public.invoice_line_items;
CREATE POLICY "open_access" ON public.invoice_line_items FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "open_access" ON public.invoice_payments;
CREATE POLICY "open_access" ON public.invoice_payments   FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "open_access" ON public.invoice_runs;
CREATE POLICY "open_access" ON public.invoice_runs       FOR ALL USING (true) WITH CHECK (true);

-- ════════════════════════════════════════════════════════════
-- 8. v_invoice_outstanding — derived outstanding (§7 status engine)
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.v_invoice_outstanding AS
SELECT
  i.id AS invoice_id,
  i.total_amount,
  i.amount_paid,
  (i.total_amount - i.amount_paid) AS outstanding,
  i.status,
  i.due_date
FROM public.invoices i
WHERE i.status <> 'cancelled';

-- Done. Phase 2 schema in place: invoices, line items, payments, series, numbering fn.

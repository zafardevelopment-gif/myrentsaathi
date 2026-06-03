-- ============================================================
-- BILLING MODULE — PHASE 9: Security deposit ledger + Credit/Debit notes
-- Run after billing-02-invoices.sql. Idempotent.
-- Design ref: docs/billing-invoice-module-design.md §20, §22
-- ============================================================

-- 1. deposit_ledger (append-only)
CREATE TABLE IF NOT EXISTS public.deposit_ledger (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id        uuid REFERENCES public.societies(id) ON DELETE SET NULL,
  landlord_id       uuid REFERENCES public.users(id)     ON DELETE SET NULL,
  flat_id           uuid REFERENCES public.flats(id)     ON DELETE SET NULL,
  tenant_id         uuid REFERENCES public.tenants(id)   ON DELETE SET NULL,
  agreement_id      uuid REFERENCES public.agreements(id) ON DELETE CASCADE,
  entry_type        text NOT NULL CHECK (entry_type IN ('collected','deduction','interest','refund','adjustment','forfeit')),
  amount            numeric NOT NULL,              -- signed: +collected/+interest, −deduction/−refund/−forfeit
  balance_after     numeric NOT NULL DEFAULT 0,
  reason            text,
  linked_invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  linked_payment_id uuid REFERENCES public.invoice_payments(id) ON DELETE SET NULL,
  entry_date        date NOT NULL DEFAULT current_date,
  created_by        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_deposit_ledger_agreement ON public.deposit_ledger (agreement_id, entry_date);

-- 2. adjustment_notes (credit/debit) + items
CREATE TABLE IF NOT EXISTS public.adjustment_notes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_number       text UNIQUE NOT NULL,
  note_type         text NOT NULL CHECK (note_type IN ('credit','debit')),
  invoice_id        uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  society_id        uuid REFERENCES public.societies(id) ON DELETE SET NULL,
  landlord_id       uuid REFERENCES public.users(id)     ON DELETE SET NULL,
  flat_id           uuid REFERENCES public.flats(id)     ON DELETE SET NULL,
  recipient_type    text,
  recipient_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reason            text,
  sub_total         numeric NOT NULL DEFAULT 0,
  gst_percent       numeric(5,2) NOT NULL DEFAULT 0,
  gst_amount        numeric NOT NULL DEFAULT 0,
  cgst_total        numeric NOT NULL DEFAULT 0,
  sgst_total        numeric NOT NULL DEFAULT 0,
  igst_total        numeric NOT NULL DEFAULT 0,
  gst_breakup       jsonb,
  total_amount      numeric NOT NULL DEFAULT 0,
  biller_gst        text,
  recipient_gst     text,
  place_of_supply   text,
  status            text NOT NULL DEFAULT 'issued' CHECK (status IN ('draft','issued','cancelled')),
  pdf_url           text,
  created_by        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_adj_notes_invoice ON public.adjustment_notes (invoice_id);
CREATE INDEX IF NOT EXISTS idx_adj_notes_scope   ON public.adjustment_notes (COALESCE(society_id, landlord_id));

CREATE TABLE IF NOT EXISTS public.adjustment_note_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id        uuid NOT NULL REFERENCES public.adjustment_notes(id) ON DELETE CASCADE,
  description    text NOT NULL,
  hsn_sac        text,
  quantity       numeric NOT NULL DEFAULT 1,
  unit_rate      numeric NOT NULL DEFAULT 0,
  line_total     numeric NOT NULL DEFAULT 0,
  gst_applicable boolean NOT NULL DEFAULT false,
  gst_percent    numeric(5,2) NOT NULL DEFAULT 0,
  gst_amount     numeric NOT NULL DEFAULT 0,
  cgst_amount    numeric NOT NULL DEFAULT 0,
  sgst_amount    numeric NOT NULL DEFAULT 0,
  igst_amount    numeric NOT NULL DEFAULT 0,
  sort_order     integer NOT NULL DEFAULT 0
);

-- 3. Views
CREATE OR REPLACE VIEW public.v_deposit_balance AS
SELECT agreement_id, COALESCE(SUM(amount), 0) AS balance
FROM public.deposit_ledger GROUP BY agreement_id;

-- Party ledger: signed entries per recipient (invoice +, payment −, credit note −, debit note +)
CREATE OR REPLACE VIEW public.v_party_ledger AS
SELECT i.recipient_user_id, i.id AS ref_id, 'invoice'  AS entry, i.invoice_number AS ref_no,
       i.issue_date AS entry_date, i.total_amount AS amount, COALESCE(i.society_id, i.landlord_id) AS biller
FROM public.invoices i WHERE i.status <> 'cancelled'
UNION ALL
SELECT i.recipient_user_id, p.id, 'payment', i.invoice_number, p.payment_date, -p.amount, COALESCE(i.society_id, i.landlord_id)
FROM public.invoice_payments p JOIN public.invoices i ON i.id = p.invoice_id WHERE p.status = 'confirmed'
UNION ALL
SELECT n.recipient_user_id, n.id, n.note_type || '_note', n.note_number, n.created_at::date,
       CASE WHEN n.note_type = 'credit' THEN -n.total_amount ELSE n.total_amount END,
       COALESCE(n.society_id, n.landlord_id)
FROM public.adjustment_notes n WHERE n.status = 'issued';

-- 4. RLS
ALTER TABLE public.deposit_ledger        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adjustment_notes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adjustment_note_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_access" ON public.deposit_ledger;
CREATE POLICY "open_access" ON public.deposit_ledger        FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "open_access" ON public.adjustment_notes;
CREATE POLICY "open_access" ON public.adjustment_notes      FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "open_access" ON public.adjustment_note_items;
CREATE POLICY "open_access" ON public.adjustment_note_items FOR ALL USING (true) WITH CHECK (true);

-- Done. Phase 9 schema: deposit_ledger, adjustment_notes(+items), ledger views.

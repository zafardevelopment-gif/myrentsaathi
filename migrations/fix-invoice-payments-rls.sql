-- Fix: payment reconciliation/webhook inserts into invoice_payments were
-- blocked by RLS ("new row violates row-level security policy") because the
-- permissive policy was missing in this DB. Re-create the open_access policies
-- (the app enforces auth at the application layer, like the rest of the schema).
--
-- Run in the Supabase SQL editor.

ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_access" ON public.invoice_payments;
CREATE POLICY "open_access" ON public.invoice_payments FOR ALL USING (true) WITH CHECK (true);

-- The DB trigger updates invoices.amount_paid/status; make sure invoices is writable too.
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_access" ON public.invoices;
CREATE POLICY "open_access" ON public.invoices FOR ALL USING (true) WITH CHECK (true);

-- Line items (read during recompute) — keep consistent.
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_access" ON public.invoice_line_items;
CREATE POLICY "open_access" ON public.invoice_line_items FOR ALL USING (true) WITH CHECK (true);

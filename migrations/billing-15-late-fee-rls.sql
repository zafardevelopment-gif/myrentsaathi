-- migrations/billing-15-late-fee-rls.sql
-- RLS policies for late_fee_rules and invoice_late_fees.
-- Mirrors reminder_rules' current policy exactly (see billing-08-notifications.sql):
-- the app does authorization at the API layer via resolveBillerScope(), not
-- real per-row RLS yet, so this is a permissive "open_access" policy — it only
-- exists so client-side reads/writes aren't blocked outright. The service-role
-- key used by cron bypasses RLS regardless.
--
-- Run AFTER billing-14-late-fees.sql (or whichever migration created these
-- two tables in your Supabase project).

ALTER TABLE public.late_fee_rules    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_late_fees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "open_access" ON public.late_fee_rules;
CREATE POLICY "open_access" ON public.late_fee_rules FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "open_access" ON public.invoice_late_fees;
CREATE POLICY "open_access" ON public.invoice_late_fees FOR ALL USING (true) WITH CHECK (true);

-- Done. late_fee_rules + invoice_late_fees now match reminder_rules' RLS posture.

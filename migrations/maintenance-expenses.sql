-- Landlord → Expenses → "My Maintenance" inserts into maintenance_expenses,
-- but the table was never created → "Could not find the table 'public.maintenance_expenses'".
-- Run once in Supabase → SQL Editor.

CREATE TABLE IF NOT EXISTS public.maintenance_expenses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flat_id       uuid NOT NULL REFERENCES public.flats(id) ON DELETE CASCADE,
  landlord_id   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  category      text NOT NULL,
  description   text,
  amount        numeric(12,2) NOT NULL CHECK (amount >= 0),
  expense_date  date NOT NULL DEFAULT current_date,
  paid_by       text NOT NULL DEFAULT 'landlord',   -- 'landlord' | 'deposit'
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS maintenance_expenses_flat_idx ON public.maintenance_expenses (flat_id, expense_date DESC);

-- Same access model as the other app tables (see vms.sql).
ALTER TABLE public.maintenance_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_access" ON public.maintenance_expenses;
CREATE POLICY "open_access" ON public.maintenance_expenses FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';

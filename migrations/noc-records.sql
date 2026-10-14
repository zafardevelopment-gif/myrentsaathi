-- NOC Generator (/landlord/noc) inserts into and lists from noc_records,
-- but the table was never created → "Could not find the table 'public.noc_records'".
-- Run once in Supabase → SQL Editor.

CREATE TABLE IF NOT EXISTS public.noc_records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flat_id         uuid REFERENCES public.flats(id) ON DELETE CASCADE,
  tenant_user_id  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  tenant_name     text,
  reason          text NOT NULL,
  remarks         text,
  generated_by    uuid REFERENCES public.users(id) ON DELETE SET NULL,
  generated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS noc_records_generated_by_idx ON public.noc_records (generated_by, generated_at DESC);

-- Same access model as the other app tables (see vms.sql).
ALTER TABLE public.noc_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_access" ON public.noc_records;
CREATE POLICY "open_access" ON public.noc_records FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';

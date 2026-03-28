-- ============================================================
-- STAFF MANAGEMENT SYSTEM
-- Run in Supabase SQL Editor
-- ============================================================

-- ── staff ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.staff (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id    uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  full_name     text NOT NULL,
  mobile        text NOT NULL,
  role          text NOT NULL,             -- Guard, Gardener, Cleaner, Electrician, Plumber, Other
  address       text,
  joining_date  date NOT NULL DEFAULT CURRENT_DATE,
  monthly_salary numeric(10,2) NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_society  ON public.staff(society_id, is_active);
CREATE INDEX IF NOT EXISTS idx_staff_role     ON public.staff(society_id, role);

-- ── staff_documents ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.staff_documents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id     uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  society_id   uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  doc_type     text NOT NULL,             -- Aadhaar, PAN, Police Verification, Photo, Other
  file_name    text NOT NULL,
  file_url     text NOT NULL,
  uploaded_by  uuid REFERENCES public.users(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_docs_staff ON public.staff_documents(staff_id);

-- ── salary_records ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.salary_records (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id       uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  society_id     uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  month_year     text NOT NULL,           -- YYYY-MM format
  amount         numeric(10,2) NOT NULL,
  status         text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','paid')),
  paid_on        date,
  payment_method text,                    -- cash, bank_transfer, upi
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, month_year)
);

CREATE INDEX IF NOT EXISTS idx_salary_staff   ON public.salary_records(staff_id, month_year DESC);
CREATE INDEX IF NOT EXISTS idx_salary_society ON public.salary_records(society_id, month_year DESC);
CREATE INDEX IF NOT EXISTS idx_salary_status  ON public.salary_records(society_id, status);

-- ── attendance_records ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id    uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  society_id  uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  date        date NOT NULL DEFAULT CURRENT_DATE,
  status      text NOT NULL DEFAULT 'present'
              CHECK (status IN ('present','absent','half_day','leave')),
  marked_by   uuid REFERENCES public.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_staff   ON public.attendance_records(staff_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_society ON public.attendance_records(society_id, date DESC);

-- ── RLS ────────────────────────────────────────────────────
ALTER TABLE public.staff               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_documents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_records      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open_access" ON public.staff               FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_access" ON public.staff_documents     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_access" ON public.salary_records      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_access" ON public.attendance_records  FOR ALL USING (true) WITH CHECK (true);

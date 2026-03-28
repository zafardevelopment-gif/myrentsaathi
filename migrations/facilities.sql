-- ============================================================
-- FACILITY BOOKING SYSTEM
-- Run in Supabase SQL Editor
-- ============================================================

-- ── facilities ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.facilities (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id       uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  name             text NOT NULL,                   -- e.g. "Banquet Hall", "Guest Room 1"
  category         text NOT NULL DEFAULT 'hall'
                   CHECK (category IN ('hall','guest_room','gym','pool','terrace','court','other')),
  description      text,
  capacity         int,                             -- max occupancy
  price_per_slot   numeric(10,2) NOT NULL DEFAULT 0, -- 0 = free
  slot_duration_hrs int NOT NULL DEFAULT 2,         -- booking slot size in hours
  open_time        time NOT NULL DEFAULT '08:00',
  close_time       time NOT NULL DEFAULT '22:00',
  advance_days     int NOT NULL DEFAULT 30,         -- how far ahead can book
  rules            text,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_facilities_society ON public.facilities(society_id, is_active);

-- ── bookings ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bookings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id      uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  facility_id     uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  resident_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  flat_number     text,
  booking_date    date NOT NULL,
  start_time      time NOT NULL,
  end_time        time NOT NULL,
  purpose         text,
  guest_count     int,
  amount          numeric(10,2) NOT NULL DEFAULT 0,
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','rejected','cancelled')),
  admin_note      text,
  reviewed_by     uuid REFERENCES public.users(id),
  reviewed_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_society    ON public.bookings(society_id, status, booking_date DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_facility   ON public.bookings(facility_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_resident   ON public.bookings(resident_id, booking_date DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_date       ON public.bookings(society_id, booking_date);

-- ── RLS ────────────────────────────────────────────────────
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open_access" ON public.facilities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_access" ON public.bookings   FOR ALL USING (true) WITH CHECK (true);

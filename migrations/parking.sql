-- ============================================================
-- PARKING MANAGEMENT SYSTEM
-- Run in Supabase SQL Editor
-- ============================================================

-- ── vehicles ───────────────────────────────────────────────
-- Resident-registered vehicles, scoped per society
CREATE TABLE IF NOT EXISTS public.vehicles (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id       uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  owner_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  flat_id          uuid REFERENCES public.flats(id) ON DELETE SET NULL,
  flat_number      text,
  vehicle_number   text NOT NULL,
  vehicle_type     text NOT NULL DEFAULT 'car'
                   CHECK (vehicle_type IN ('car','bike','truck','other')),
  vehicle_model    text,
  color            text,
  status           text NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','inactive')),
  is_authorized    boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (society_id, vehicle_number)
);

CREATE INDEX IF NOT EXISTS idx_vehicles_society      ON public.vehicles(society_id, status);
CREATE INDEX IF NOT EXISTS idx_vehicles_owner        ON public.vehicles(owner_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_number       ON public.vehicles(society_id, vehicle_number);

-- ── vehicle_parking_passes ─────────────────────────────────
-- Digital pass linking a vehicle to an assigned slot
CREATE TABLE IF NOT EXISTS public.vehicle_parking_passes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id     uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  vehicle_id     uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  slot_id        uuid NOT NULL REFERENCES public.parking_slots(id) ON DELETE CASCADE,
  owner_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  issued_by      uuid REFERENCES public.users(id),
  valid_from     date NOT NULL DEFAULT CURRENT_DATE,
  valid_until    date,                          -- null = indefinite
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vehicle_id, slot_id)
);

CREATE INDEX IF NOT EXISTS idx_vpp_vehicle  ON public.vehicle_parking_passes(vehicle_id, is_active);
CREATE INDEX IF NOT EXISTS idx_vpp_slot     ON public.vehicle_parking_passes(slot_id, is_active);
CREATE INDEX IF NOT EXISTS idx_vpp_owner    ON public.vehicle_parking_passes(owner_id, is_active);

-- ── RLS ────────────────────────────────────────────────────
ALTER TABLE public.vehicles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_parking_passes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open_access" ON public.vehicles               FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_access" ON public.vehicle_parking_passes FOR ALL USING (true) WITH CHECK (true);

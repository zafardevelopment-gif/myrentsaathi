-- ============================================================
-- BILLING MODULE — PHASE 5: Meters & Electricity
-- Run after billing-02-invoices.sql. Idempotent.
-- Design ref: docs/billing-invoice-module-design.md §5, §24
-- ============================================================

-- 1. meters (master)
CREATE TABLE IF NOT EXISTS public.meters (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id      uuid REFERENCES public.societies(id) ON DELETE CASCADE,
  landlord_id     uuid REFERENCES public.users(id)     ON DELETE CASCADE,
  flat_id         uuid REFERENCES public.flats(id)     ON DELETE CASCADE,  -- NULL ⇒ common/property meter
  scope           text NOT NULL DEFAULT 'unit' CHECK (scope IN ('unit','common')),
  meter_number    text,
  meter_type      text NOT NULL DEFAULT 'electricity',  -- electricity|water|gas|generator
  unit_label      text NOT NULL DEFAULT 'kWh',
  initial_reading numeric NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meters_scope ON public.meters (COALESCE(society_id, landlord_id));
CREATE INDEX IF NOT EXISTS idx_meters_flat  ON public.meters (flat_id);

-- 2. meter_readings (history). units_consumed derived by trigger (handles reset).
CREATE TABLE IF NOT EXISTS public.meter_readings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meter_id         uuid NOT NULL REFERENCES public.meters(id) ON DELETE CASCADE,
  reading_date     date NOT NULL DEFAULT current_date,
  billing_period   text NOT NULL,        -- 'YYYY-MM'
  previous_reading numeric NOT NULL DEFAULT 0,
  current_reading  numeric NOT NULL,
  units_consumed   numeric NOT NULL DEFAULT 0,
  is_meter_reset   boolean NOT NULL DEFAULT false,
  reading_by       uuid REFERENCES public.users(id) ON DELETE SET NULL,
  invoice_id       uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (meter_id, billing_period)
);
CREATE INDEX IF NOT EXISTS idx_readings_meter ON public.meter_readings (meter_id, billing_period);

-- units_consumed = current - previous (or current when meter reset); block negatives.
CREATE OR REPLACE FUNCTION public.fn_compute_units_consumed()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_meter_reset THEN
    NEW.units_consumed := GREATEST(NEW.current_reading, 0);
  ELSE
    NEW.units_consumed := GREATEST(NEW.current_reading - NEW.previous_reading, 0);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_units_consumed ON public.meter_readings;
CREATE TRIGGER trg_units_consumed
  BEFORE INSERT OR UPDATE ON public.meter_readings
  FOR EACH ROW EXECUTE FUNCTION public.fn_compute_units_consumed();

-- 3. common_meter_config + weights (§24)
CREATE TABLE IF NOT EXISTS public.common_meter_config (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meter_id          uuid NOT NULL REFERENCES public.meters(id) ON DELETE CASCADE,
  allocation_method text NOT NULL DEFAULT 'equal'
                      CHECK (allocation_method IN ('equal','area_sqft','occupancy','submeter_diff','custom_weight')),
  scope             text NOT NULL DEFAULT 'society' CHECK (scope IN ('society','block','floor','custom')),
  scope_value       text,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (meter_id)
);
CREATE TABLE IF NOT EXISTS public.common_meter_weights (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  common_meter_config_id uuid NOT NULL REFERENCES public.common_meter_config(id) ON DELETE CASCADE,
  flat_id                uuid NOT NULL REFERENCES public.flats(id) ON DELETE CASCADE,
  weight                 numeric NOT NULL DEFAULT 1,
  UNIQUE (common_meter_config_id, flat_id)
);

-- 4. Deferred FK: invoice_line_items.meter_reading_id → meter_readings
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_line_items_meter_reading'
  ) THEN
    ALTER TABLE public.invoice_line_items
      ADD CONSTRAINT fk_line_items_meter_reading
      FOREIGN KEY (meter_reading_id) REFERENCES public.meter_readings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5. RLS
ALTER TABLE public.meters               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meter_readings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.common_meter_config  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.common_meter_weights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_access" ON public.meters;
CREATE POLICY "open_access" ON public.meters               FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "open_access" ON public.meter_readings;
CREATE POLICY "open_access" ON public.meter_readings       FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "open_access" ON public.common_meter_config;
CREATE POLICY "open_access" ON public.common_meter_config  FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "open_access" ON public.common_meter_weights;
CREATE POLICY "open_access" ON public.common_meter_weights FOR ALL USING (true) WITH CHECK (true);

-- Done. Phase 5 schema: meters, readings, common-meter allocation config.

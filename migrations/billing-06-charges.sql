-- ============================================================
-- BILLING MODULE — PHASE 6: Additional charges + Late-fee engine
-- Run after billing-02-invoices.sql. Idempotent.
-- Design ref: docs/billing-invoice-module-design.md §23, §21
-- ============================================================

-- 1. charge_types — catalog (parking, water, generator, internet, club, …)
CREATE TABLE IF NOT EXISTS public.charge_types (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id             uuid REFERENCES public.societies(id) ON DELETE CASCADE,
  landlord_id            uuid REFERENCES public.users(id)     ON DELETE CASCADE,
  code                   text NOT NULL,
  name                   text NOT NULL,
  default_amount         numeric,
  billing_frequency      text NOT NULL DEFAULT 'monthly' CHECK (billing_frequency IN ('monthly','quarterly','one_time')),
  is_metered             boolean NOT NULL DEFAULT false,
  meter_type             text,
  gst_applicable         boolean NOT NULL DEFAULT false,
  default_gst_percent    numeric(5,2) NOT NULL DEFAULT 0,
  hsn_sac                text,
  default_recipient_type text NOT NULL DEFAULT 'tenant' CHECK (default_recipient_type IN ('tenant','owner','landlord')),
  is_active              boolean NOT NULL DEFAULT true,
  created_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_charge_types_scope ON public.charge_types (COALESCE(society_id, landlord_id));

-- 2. unit_recurring_charges — assign a charge to a unit
CREATE TABLE IF NOT EXISTS public.unit_recurring_charges (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flat_id         uuid NOT NULL REFERENCES public.flats(id) ON DELETE CASCADE,
  tenant_id       uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  charge_type_id  uuid NOT NULL REFERENCES public.charge_types(id) ON DELETE CASCADE,
  amount_override numeric,
  start_period    text NOT NULL,        -- 'YYYY-MM'
  end_period      text,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (flat_id, charge_type_id, start_period)
);
CREATE INDEX IF NOT EXISTS idx_unit_charges_flat ON public.unit_recurring_charges (flat_id);

-- 3. late_fee_rules (§21)
CREATE TABLE IF NOT EXISTS public.late_fee_rules (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id     uuid REFERENCES public.societies(id) ON DELETE CASCADE,
  landlord_id    uuid REFERENCES public.users(id)     ON DELETE CASCADE,
  invoice_type   text NOT NULL DEFAULT 'all',   -- specific type or 'all'
  grace_days     integer NOT NULL DEFAULT 0,
  fee_type       text NOT NULL DEFAULT 'flat' CHECK (fee_type IN ('flat','percent_outstanding','per_day')),
  fee_value      numeric NOT NULL DEFAULT 0,
  max_fee        numeric,
  compounding    boolean NOT NULL DEFAULT false,
  gst_applicable boolean NOT NULL DEFAULT false,  -- penalty, GST-exempt by default
  is_active      boolean NOT NULL DEFAULT true,
  effective_from date NOT NULL DEFAULT current_date,
  effective_to   date,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_late_fee_rules_scope ON public.late_fee_rules (COALESCE(society_id, landlord_id));

-- 4. Deferred FK: invoice_line_items.charge_type_id → charge_types
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_line_items_charge_type') THEN
    ALTER TABLE public.invoice_line_items
      ADD CONSTRAINT fk_line_items_charge_type
      FOREIGN KEY (charge_type_id) REFERENCES public.charge_types(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5. RLS
ALTER TABLE public.charge_types           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_recurring_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.late_fee_rules         ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_access" ON public.charge_types;
CREATE POLICY "open_access" ON public.charge_types           FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "open_access" ON public.unit_recurring_charges;
CREATE POLICY "open_access" ON public.unit_recurring_charges FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "open_access" ON public.late_fee_rules;
CREATE POLICY "open_access" ON public.late_fee_rules         FOR ALL USING (true) WITH CHECK (true);

-- Done. Phase 6 schema: charge_types, unit_recurring_charges, late_fee_rules.

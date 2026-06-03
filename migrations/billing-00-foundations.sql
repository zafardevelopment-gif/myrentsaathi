-- ============================================================
-- BILLING MODULE — PHASE 0: Foundations & Schema
-- Run in Supabase SQL Editor. Idempotent (safe to re-run).
--
-- Adds the config/master tables and the column additions that
-- everything else in the billing module builds on. NO invoices
-- are created here. Nothing existing is dropped or altered
-- destructively — additive only.
--
-- Design ref: docs/billing-invoice-module-design.md §0, §2, §3, §6
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- 1. COLUMN ADDITIONS TO EXISTING TABLES
-- ════════════════════════════════════════════════════════════

-- flats: rental type (authoritative per unit) + per-unit rent GST eligibility (§2, §3)
ALTER TABLE public.flats
  ADD COLUMN IF NOT EXISTS rental_type        text,
  ADD COLUMN IF NOT EXISTS rent_gst_applicable boolean DEFAULT false;

-- societies: UI default rental type + GST place-of-supply state code (§2, §3.2)
-- NOTE: societies.registration_number and societies.state (full name) already exist.
-- state_code is the 2-digit GST state code (e.g. '27' = Maharashtra), distinct from the name.
ALTER TABLE public.societies
  ADD COLUMN IF NOT EXISTS default_rental_type text,
  ADD COLUMN IF NOT EXISTS state_code          text;

-- tenants: GSTIN (B2B tenants) + GST state code for place-of-supply (§3, §3.2)
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS gst_number text,
  ADD COLUMN IF NOT EXISTS state_code text;

-- ════════════════════════════════════════════════════════════
-- 2. billing_profiles — one per biller (society OR landlord)  (§3)
--    "Who is billing" — legal name, GSTIN, PAN, logo, state.
--    Separate from bank_accounts ("where money lands").
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.billing_profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     text NOT NULL CHECK (entity_type IN ('society','landlord')),
  entity_id       uuid NOT NULL,                 -- societies.id or users.id
  society_id      uuid REFERENCES public.societies(id) ON DELETE CASCADE,
  landlord_id     uuid REFERENCES public.users(id)     ON DELETE CASCADE,
  legal_name      text NOT NULL,
  gst_number      text,                          -- company/biller GSTIN
  pan_number      text,
  state_code      text,                          -- GST state code for IGST/CGST split (§3.2)
  address         text,
  logo_url        text,
  invoice_prefix  text DEFAULT 'INV',            -- default series prefix
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id)                -- one profile per biller
);
CREATE INDEX IF NOT EXISTS idx_billing_profiles_entity
  ON public.billing_profiles (entity_type, entity_id);

-- ════════════════════════════════════════════════════════════
-- 3. invoice_type_config — per biller + invoice type  (§3, §19)
--    Is GST applicable? Who is the default recipient?
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.invoice_type_config (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id             uuid REFERENCES public.societies(id) ON DELETE CASCADE,
  landlord_id            uuid REFERENCES public.users(id)     ON DELETE CASCADE,
  invoice_type           text NOT NULL,          -- 'rent'|'maintenance'|'electricity'|'charges'
  gst_applicable         boolean NOT NULL DEFAULT false,
  default_recipient_type text NOT NULL DEFAULT 'tenant'
                          CHECK (default_recipient_type IN ('tenant','owner','landlord')),
  is_active              boolean NOT NULL DEFAULT true,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);
-- One config per (biller, invoice_type). coalesce() handles the society-OR-landlord nullability.
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoice_type_config_biller_type
  ON public.invoice_type_config (COALESCE(society_id, landlord_id), invoice_type);

-- ════════════════════════════════════════════════════════════
-- 4. gst_rate_config — EDITABLE, VERSIONED GST rate  (§3.1, §3.2)
--    Govt changes 18%→x: close current row, insert a new one.
--    Never edit history. Invoice snapshots the rate at issue.
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.gst_rate_config (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id     uuid REFERENCES public.societies(id) ON DELETE CASCADE,  -- NULL ⇒ platform default
  landlord_id    uuid REFERENCES public.users(id)     ON DELETE CASCADE,
  applies_to     text NOT NULL,                  -- 'rent' | charge_types.code | HSN/SAC
  rate_percent   numeric(5,2) NOT NULL,          -- e.g. 18.00 (editable)
  cgst_percent   numeric(5,2) NOT NULL DEFAULT 0, -- rate/2 for intra-state
  sgst_percent   numeric(5,2) NOT NULL DEFAULT 0, -- rate/2 for intra-state (IGST = rate, derived)
  effective_from date NOT NULL DEFAULT current_date,
  effective_to   date,                           -- NULL = currently active
  is_active      boolean NOT NULL DEFAULT true,
  created_by     uuid REFERENCES public.users(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gst_rate_config_lookup
  ON public.gst_rate_config (COALESCE(society_id, landlord_id), applies_to, effective_from);

-- ════════════════════════════════════════════════════════════
-- 5. charge_rate_config — scalable rate config  (§6, §23, §24)
--    Starts flat; grows into slab/fixed/common without schema change.
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.charge_rate_config (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id     uuid REFERENCES public.societies(id) ON DELETE CASCADE,
  landlord_id    uuid REFERENCES public.users(id)     ON DELETE CASCADE,
  charge_kind    text NOT NULL,                  -- 'electricity' | charge_types.code
  rate_type      text NOT NULL DEFAULT 'flat' CHECK (rate_type IN ('flat','slab','fixed')),
  flat_rate      numeric,                        -- ₹/unit when 'flat'
  fixed_amount   numeric,                        -- ₹/period when 'fixed'
  slabs          jsonb,                          -- [{from,to,rate}] when 'slab'
  common_alloc   text,                           -- legacy hint; full config in common_meter_config (§24)
  effective_from date NOT NULL DEFAULT current_date,
  effective_to   date,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_charge_rate_config_lookup
  ON public.charge_rate_config (COALESCE(society_id, landlord_id), charge_kind, effective_from);

-- ════════════════════════════════════════════════════════════
-- 6. ROW LEVEL SECURITY — open_access (matches existing tables; tightened in SaaS phase §16)
-- ════════════════════════════════════════════════════════════
ALTER TABLE public.billing_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_type_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_rate_config     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charge_rate_config  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "open_access" ON public.billing_profiles;
CREATE POLICY "open_access" ON public.billing_profiles    FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "open_access" ON public.invoice_type_config;
CREATE POLICY "open_access" ON public.invoice_type_config FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "open_access" ON public.gst_rate_config;
CREATE POLICY "open_access" ON public.gst_rate_config     FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "open_access" ON public.charge_rate_config;
CREATE POLICY "open_access" ON public.charge_rate_config  FOR ALL USING (true) WITH CHECK (true);

-- ════════════════════════════════════════════════════════════
-- 7. SEED — platform-default GST rate (rent @ 18%, editable later via UI)
--    society_id/landlord_id NULL ⇒ the default every biller inherits.
-- ════════════════════════════════════════════════════════════
INSERT INTO public.gst_rate_config (society_id, landlord_id, applies_to, rate_percent, cgst_percent, sgst_percent, effective_from)
SELECT NULL, NULL, 'rent', 18.00, 9.00, 9.00, current_date
WHERE NOT EXISTS (
  SELECT 1 FROM public.gst_rate_config
  WHERE society_id IS NULL AND landlord_id IS NULL AND applies_to = 'rent' AND effective_to IS NULL
);

-- Done. Phase 0 complete: config tables + column additions in place.

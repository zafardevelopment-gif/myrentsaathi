-- ============================================================
-- BILLING MODULE — PHASE 1: Onboarding state & bulk import
-- Run after billing-00-foundations.sql. Idempotent.
--
-- Setup *completion* is derived LIVE from existing data (§30) — NOT
-- stored here. This table persists only the UX state that can't be
-- derived: wizard markers, skipped optional steps, dismissed alerts,
-- and a cached percent for fast paint.
--
-- Design ref: docs/billing-invoice-module-design.md §30, §32, §36
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- 1. onboarding_state — one row per user
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.onboarding_state (
  user_id          uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  user_type        text,                           -- 'landlord' | 'society' (filled on first progress read)
  society_id       uuid REFERENCES public.societies(id) ON DELETE SET NULL,
  started_at       timestamptz NOT NULL DEFAULT now(),
  completed_at     timestamptz,
  last_step        text,
  skipped_steps    text[] NOT NULL DEFAULT '{}',
  dismissed_alerts text[] NOT NULL DEFAULT '{}',
  cached_percent   integer NOT NULL DEFAULT 0,
  cached_steps     jsonb,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ════════════════════════════════════════════════════════════
-- 2. society_blocks — optional managed wing/block list (§32)
--    flats.block free-text still works; this just gives a tidy list.
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.society_blocks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id  uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  name        text NOT NULL,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (society_id, name)
);

-- ════════════════════════════════════════════════════════════
-- 3. import_jobs — CSV/Excel bulk import audit (§36)
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.import_jobs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  society_id  uuid REFERENCES public.societies(id) ON DELETE SET NULL,
  kind        text NOT NULL CHECK (kind IN ('flats','tenants','owners')),
  file_name   text,
  total       integer NOT NULL DEFAULT 0,
  succeeded   integer NOT NULL DEFAULT 0,
  failed      integer NOT NULL DEFAULT 0,
  errors      jsonb NOT NULL DEFAULT '[]'::jsonb,
  status      text NOT NULL DEFAULT 'previewed' CHECK (status IN ('previewed','committed','failed')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ════════════════════════════════════════════════════════════
-- 4. RLS — open_access (matches existing; tightened in SaaS phase §16)
-- ════════════════════════════════════════════════════════════
ALTER TABLE public.onboarding_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.society_blocks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_jobs      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "open_access" ON public.onboarding_state;
CREATE POLICY "open_access" ON public.onboarding_state FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "open_access" ON public.society_blocks;
CREATE POLICY "open_access" ON public.society_blocks   FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "open_access" ON public.import_jobs;
CREATE POLICY "open_access" ON public.import_jobs      FOR ALL USING (true) WITH CHECK (true);

-- Done. Phase 1 schema: onboarding_state, society_blocks, import_jobs.

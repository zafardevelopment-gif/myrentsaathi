-- ============================================================
-- SUBSCRIPTION SYSTEM
-- Tracks active plans for society_admin and landlord users
-- Run in Supabase SQL Editor
-- ============================================================

-- ── platform_settings ──────────────────────────────────────
-- Key-value store for super admin controlled settings
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key         text PRIMARY KEY,
  value       text NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Default: free trial = 30 days (super admin can change this)
INSERT INTO public.platform_settings (key, value)
VALUES ('free_trial_days', '30')
ON CONFLICT (key) DO NOTHING;

-- ── subscriptions ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  -- For society_admin: also store society_id
  society_id      uuid REFERENCES public.societies(id) ON DELETE CASCADE,
  plan_type       text NOT NULL,           -- 'society' | 'landlord'
  plan_name       text NOT NULL,           -- e.g. 'Starter', 'Professional', 'Enterprise'
  plan_price      numeric(10,2) NOT NULL DEFAULT 0,
  status          text NOT NULL DEFAULT 'trial',
  -- 'trial'   → free trial active
  -- 'active'  → paid plan active
  -- 'expired' → plan/trial ended, login blocked
  -- 'cancelled' → manually cancelled
  trial_days      integer NOT NULL DEFAULT 30,  -- how many days trial was given
  starts_at       timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL,          -- trial/plan end date
  activated_at    timestamptz,                   -- when paid plan was activated
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user    ON public.subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_society ON public.subscriptions(society_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires ON public.subscriptions(expires_at, status);

-- ── updated_at trigger ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS ────────────────────────────────────────────────────
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Allow anon read/write for app (no Supabase Auth used)
CREATE POLICY "anon_all_subscriptions" ON public.subscriptions
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_platform_settings" ON public.platform_settings
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================
-- PRICING SYSTEM — Dynamic pricing controlled by Super Admin
-- Run in Supabase SQL Editor
-- ============================================================

-- ── pricing_plans ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pricing_plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type       text NOT NULL DEFAULT 'society',  -- 'society' | 'landlord'
  name            text NOT NULL,
  price           numeric(10,2) NOT NULL DEFAULT 0,
  price_yearly    numeric(10,2),                    -- optional yearly price
  duration        text NOT NULL DEFAULT 'monthly',  -- 'monthly' | 'yearly'
  property_limit  integer,                          -- NULL = unlimited
  is_popular      boolean NOT NULL DEFAULT false,
  is_active       boolean NOT NULL DEFAULT true,
  sort_order      integer NOT NULL DEFAULT 0,
  cta_text        text NOT NULL DEFAULT 'Start Free Trial',
  description     text,
  badge_text      text,                             -- e.g. "MOST POPULAR"
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── pricing_features ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pricing_features (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id      uuid NOT NULL REFERENCES public.pricing_plans(id) ON DELETE CASCADE,
  feature_text text NOT NULL,
  is_highlight boolean NOT NULL DEFAULT false,
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pricing_plans_active    ON public.pricing_plans(is_active, plan_type, sort_order);
CREATE INDEX IF NOT EXISTS idx_pricing_features_plan   ON public.pricing_features(plan_id, sort_order);

-- ── updated_at trigger ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pricing_plans_updated_at ON public.pricing_plans;
CREATE TRIGGER trg_pricing_plans_updated_at
  BEFORE UPDATE ON public.pricing_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS ────────────────────────────────────────────────────
ALTER TABLE public.pricing_plans    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_features ENABLE ROW LEVEL SECURITY;

-- Public read: anyone can read active plans (website)
CREATE POLICY "Public read pricing_plans"
  ON public.pricing_plans FOR SELECT
  USING (true);

CREATE POLICY "Public read pricing_features"
  ON public.pricing_features FOR SELECT
  USING (true);

-- Anon write policies (codebase uses anon key throughout — no service role key needed)
-- These allow the superadmin UI to create/update/delete pricing plans.
-- Restrict further once auth is implemented (check role = 'superadmin').

CREATE POLICY "Anon insert pricing_plans"
  ON public.pricing_plans FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anon update pricing_plans"
  ON public.pricing_plans FOR UPDATE
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon delete pricing_plans"
  ON public.pricing_plans FOR DELETE
  USING (true);

CREATE POLICY "Anon insert pricing_features"
  ON public.pricing_features FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anon update pricing_features"
  ON public.pricing_features FOR UPDATE
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon delete pricing_features"
  ON public.pricing_features FOR DELETE
  USING (true);

-- ── SEED DATA — Society Plans ──────────────────────────────
INSERT INTO public.pricing_plans
  (plan_type, name, price, price_yearly, duration, property_limit, is_popular, is_active, sort_order, cta_text, description)
VALUES
  ('society', 'Starter',      2999, 29990, 'monthly',  30,   false, true, 1, 'Start Free Trial', 'Small societies (up to 30 flats)'),
  ('society', 'Professional', 5999, 59990, 'monthly', 100,   true,  true, 2, 'Start Free Trial', 'Medium societies (up to 100 flats)'),
  ('society', 'Enterprise',   9999, 99990, 'monthly',  NULL, false, true, 3, 'Contact Sales',    'Large societies (unlimited flats)')
ON CONFLICT DO NOTHING;

-- ── SEED DATA — Society Features ──────────────────────────
-- Starter features
WITH starter AS (SELECT id FROM public.pricing_plans WHERE name = 'Starter' AND plan_type = 'society' LIMIT 1)
INSERT INTO public.pricing_features (plan_id, feature_text, is_highlight, sort_order)
SELECT starter.id, feat.feature_text, feat.is_highlight, feat.sort_order
FROM starter, (VALUES
  ('30 flats management',             false, 1),
  ('Maintenance collection',          false, 2),
  ('Complaint tickets',               false, 3),
  ('WhatsApp reminders (500/mo)',     false, 4),
  ('Basic reports',                   false, 5),
  ('Email support',                   false, 6)
) AS feat(feature_text, is_highlight, sort_order)
ON CONFLICT DO NOTHING;

-- Professional features
WITH pro AS (SELECT id FROM public.pricing_plans WHERE name = 'Professional' AND plan_type = 'society' LIMIT 1)
INSERT INTO public.pricing_features (plan_id, feature_text, is_highlight, sort_order)
SELECT pro.id, feat.feature_text, feat.is_highlight, feat.sort_order
FROM pro, (VALUES
  ('100 flats management',             true,  1),
  ('Everything in Starter',            false, 2),
  ('Expense management + approval',    false, 3),
  ('Parking management',               false, 4),
  ('Polls & voting',                   false, 5),
  ('WhatsApp reminders (2,000/mo)',    false, 6),
  ('Document vault',                   false, 7),
  ('Priority support',                 true,  8)
) AS feat(feature_text, is_highlight, sort_order)
ON CONFLICT DO NOTHING;

-- Enterprise features
WITH ent AS (SELECT id FROM public.pricing_plans WHERE name = 'Enterprise' AND plan_type = 'society' LIMIT 1)
INSERT INTO public.pricing_features (plan_id, feature_text, is_highlight, sort_order)
SELECT ent.id, feat.feature_text, feat.is_highlight, feat.sort_order
FROM ent, (VALUES
  ('Unlimited flats',                  true,  1),
  ('Everything in Professional',       false, 2),
  ('Multi-wing/tower support',         false, 3),
  ('WhatsApp unlimited',               false, 4),
  ('Custom reports',                   false, 5),
  ('Dedicated account manager',        true,  6),
  ('API access',                       false, 7),
  ('On-call support',                  false, 8)
) AS feat(feature_text, is_highlight, sort_order)
ON CONFLICT DO NOTHING;

-- ── SEED DATA — Landlord Plans ────────────────────────────
INSERT INTO public.pricing_plans
  (plan_type, name, price, price_yearly, duration, property_limit, is_popular, is_active, sort_order, cta_text, description)
VALUES
  ('landlord', 'Basic',  499,  4990, 'monthly',  3,    false, true, 1, 'Start Free Trial', 'Up to 3 properties'),
  ('landlord', 'Pro',    999,  9990, 'monthly',  10,   true,  true, 2, 'Start Free Trial', 'Up to 10 properties'),
  ('landlord', 'NRI',   1999, 19990, 'monthly',  NULL, false, true, 3, 'Start Free Trial', 'Unlimited + remote management')
ON CONFLICT DO NOTHING;

-- Basic landlord features
WITH basic AS (SELECT id FROM public.pricing_plans WHERE name = 'Basic' AND plan_type = 'landlord' LIMIT 1)
INSERT INTO public.pricing_features (plan_id, feature_text, is_highlight, sort_order)
SELECT basic.id, feat.feature_text, feat.is_highlight, feat.sort_order
FROM basic, (VALUES
  ('3 property management',    false, 1),
  ('Rent collection + tracking', false, 2),
  ('Tenant management',        false, 3),
  ('WhatsApp reminders',       false, 4),
  ('Payment receipts',         false, 5),
  ('Basic reports',            false, 6)
) AS feat(feature_text, is_highlight, sort_order)
ON CONFLICT DO NOTHING;

-- Pro landlord features
WITH pro AS (SELECT id FROM public.pricing_plans WHERE name = 'Pro' AND plan_type = 'landlord' LIMIT 1)
INSERT INTO public.pricing_features (plan_id, feature_text, is_highlight, sort_order)
SELECT pro.id, feat.feature_text, feat.is_highlight, feat.sort_order
FROM pro, (VALUES
  ('10 property management',          true,  1),
  ('Everything in Basic',             false, 2),
  ('Agreement generator (free drafts)', false, 3),
  ('Tax-ready reports',               false, 4),
  ('Multi-society view',              false, 5),
  ('Priority support',                true,  6)
) AS feat(feature_text, is_highlight, sort_order)
ON CONFLICT DO NOTHING;

-- NRI landlord features
WITH nri AS (SELECT id FROM public.pricing_plans WHERE name = 'NRI' AND plan_type = 'landlord' LIMIT 1)
INSERT INTO public.pricing_features (plan_id, feature_text, is_highlight, sort_order)
SELECT nri.id, feat.feature_text, feat.is_highlight, feat.sort_order
FROM nri, (VALUES
  ('Unlimited properties',         true,  1),
  ('Everything in Pro',            false, 2),
  ('NRI tax reports',              true,  3),
  ('Power of Attorney support',    false, 4),
  ('Multi-city dashboard',         false, 5),
  ('WhatsApp-only management',     false, 6),
  ('Dedicated NRI support',        true,  7)
) AS feat(feature_text, is_highlight, sort_order)
ON CONFLICT DO NOTHING;

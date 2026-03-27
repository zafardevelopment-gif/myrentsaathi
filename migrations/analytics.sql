-- ============================================================
-- ANALYTICS SYSTEM — Lightweight page visits + login tracking
-- Run in Supabase SQL Editor
-- ============================================================

-- ── page_visits ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.page_visits (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page        text NOT NULL,                        -- e.g. "/", "/pricing"
  user_id     text,                                 -- nullable for guests
  role        text NOT NULL DEFAULT 'guest',        -- guest / admin / landlord / tenant / superadmin
  ip_address  text,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_visits_page       ON public.page_visits(page, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_visits_created_at ON public.page_visits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_visits_role       ON public.page_visits(role, created_at DESC);

-- ── user_logins ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_logins (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     text NOT NULL,
  role        text NOT NULL,                        -- society_admin / landlord / tenant / superadmin
  login_time  timestamptz NOT NULL DEFAULT now(),
  ip_address  text
);

CREATE INDEX IF NOT EXISTS idx_user_logins_role       ON public.user_logins(role, login_time DESC);
CREATE INDEX IF NOT EXISTS idx_user_logins_login_time ON public.user_logins(login_time DESC);

-- ── RLS ────────────────────────────────────────────────────
ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_logins ENABLE ROW LEVEL SECURITY;

-- Anyone (anon key) can insert — fire-and-forget tracking calls
CREATE POLICY "Anon insert page_visits"
  ON public.page_visits FOR INSERT WITH CHECK (true);

CREATE POLICY "Anon insert user_logins"
  ON public.user_logins FOR INSERT WITH CHECK (true);

-- Only allow reads via service role / superadmin (select blocked for anon)
-- SuperAdmin dashboard reads directly with anon key — allow for now:
CREATE POLICY "Anon read page_visits"
  ON public.page_visits FOR SELECT USING (true);

CREATE POLICY "Anon read user_logins"
  ON public.user_logins FOR SELECT USING (true);

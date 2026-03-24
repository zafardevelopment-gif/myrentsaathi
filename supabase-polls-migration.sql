-- ============================================================
-- Polls Migration — run in Supabase SQL Editor
-- Adds audience targeting to polls table
-- ============================================================

-- 1. Add target_audience to polls (who can see & vote)
--    Values: 'all' | 'board' | 'landlords' | 'tenants' | 'board,landlords' etc.
ALTER TABLE public.polls
  ADD COLUMN IF NOT EXISTS target_audience TEXT NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- 2. Create poll_options table (stores each option for a poll)
CREATE TABLE IF NOT EXISTS public.poll_options (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id     UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  sort_order  INT  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create poll_votes table (one row per user per poll)
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id    UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id  UUID NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  voter_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (poll_id, voter_id)   -- one vote per user per poll
);

-- 4. RLS policies
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_full_poll_options" ON public.poll_options
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "anon_full_poll_votes" ON public.poll_votes
  FOR ALL USING (true) WITH CHECK (true);

-- 5. Make sure polls table has RLS on (already in supabase-superadmin-policies.sql)
-- ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
-- Already done by previous migration.

-- ============================================================
-- DONE. Now seed some sample polls:
-- ============================================================
-- (Optional — only run if societies already exist)
-- INSERT INTO public.polls (society_id, title, description, status, target_audience, ends_at, created_by)
-- VALUES
--   ('<gv_society_id>', 'Should we install EV charging?', 'Community vote on installing 2 EV charging points in B-block parking', 'active', 'all', NOW() + INTERVAL '7 days', '<admin_user_id>'),
--   ('<gv_society_id>', 'AGM Meeting Time', 'Choose preferred AGM slot', 'active', 'board,landlords', NOW() + INTERVAL '3 days', '<admin_user_id>');

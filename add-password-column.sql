-- ============================================================
-- Run this in Supabase SQL Editor BEFORE using signup/login
-- Adds password column to users table
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS password TEXT;

-- RLS policy for password column (anon can read for login)
-- Already covered by superadmin_full_access_users policy

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

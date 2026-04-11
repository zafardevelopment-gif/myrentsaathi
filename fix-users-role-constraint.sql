-- Fix users_role_check constraint to include all roles used by the app
-- Run this in Supabase SQL Editor (once per project)

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN (
    'superadmin',
    'society_admin',
    'admin',
    'landlord',
    'tenant',
    'guard',
    'board_member'
  ));

-- ============================================================
-- MyRentSaathi — Login Credentials SQL Script
-- Run this against your Supabase (PostgreSQL) database
-- ============================================================

-- 1. Users table (extend as needed with Supabase Auth)
CREATE TABLE IF NOT EXISTS mrs_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,         -- store bcrypt hash in production
  name          TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'board', 'landlord', 'tenant', 'superadmin')),
  phone         TEXT,
  society_id    TEXT,
  flat_id       TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. Demo users
--    Passwords shown in plaintext for demo purposes only.
--    In production, replace password_hash with bcrypt hashes.
--    e.g. bcrypt('Admin@123', 10)
-- ============================================================

-- Society Admin
INSERT INTO mrs_users (email, password_hash, name, role, phone, society_id)
VALUES (
  'admin@greenvalley.com',
  'Admin@123',                         -- REPLACE with bcrypt hash in production
  'Society Admin',
  'admin',
  '+91 98765 00000',
  'S1'
) ON CONFLICT (email) DO NOTHING;

-- Board Member
INSERT INTO mrs_users (email, password_hash, name, role, phone, society_id)
VALUES (
  'suresh@greenvalley.com',
  'Board@123',                         -- REPLACE with bcrypt hash in production
  'Suresh Kumar',
  'board',
  '+91 98765 11111',
  'S1'
) ON CONFLICT (email) DO NOTHING;

-- Landlord
INSERT INTO mrs_users (email, password_hash, name, role, phone, society_id)
VALUES (
  'vikram@gmail.com',
  'Landlord@123',                      -- REPLACE with bcrypt hash in production
  'Vikram Malhotra',
  'landlord',
  '+91 98765 00001',
  'S1'
) ON CONFLICT (email) DO NOTHING;

-- Tenant
INSERT INTO mrs_users (email, password_hash, name, role, phone, society_id, flat_id)
VALUES (
  'rajesh@gmail.com',
  'Tenant@123',                        -- REPLACE with bcrypt hash in production
  'Rajesh Sharma',
  'tenant',
  '+91 98765 43210',
  'S1',
  'F1'
) ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- 3. Additional demo users (optional extras)
-- ============================================================

-- Second Landlord
INSERT INTO mrs_users (email, password_hash, name, role, phone, society_id)
VALUES (
  'priyanka@gmail.com',
  'Landlord@456',
  'Priyanka Desai',
  'landlord',
  '+91 98765 00002',
  'S1'
) ON CONFLICT (email) DO NOTHING;

-- Tenant 2
INSERT INTO mrs_users (email, password_hash, name, role, phone, society_id, flat_id)
VALUES (
  'priya@gmail.com',
  'Tenant@456',
  'Priya Mehta',
  'tenant',
  '+91 87654 32109',
  'S1',
  'F2'
) ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- 4. Verify inserted records
-- ============================================================
SELECT id, email, name, role, phone, society_id, flat_id, is_active, created_at
FROM mrs_users
ORDER BY
  CASE role
    WHEN 'admin'    THEN 1
    WHEN 'board'    THEN 2
    WHEN 'landlord' THEN 3
    WHEN 'tenant'   THEN 4
  END;

-- ============================================================
-- DEMO LOGIN CREDENTIALS SUMMARY
-- ============================================================
--
--  Role            | Email                           | Password
--  ----------------+---------------------------------+-------------
--  Super Admin     | superadmin@myrentsaathi.com     | Super@123
--  Society Admin   | admin@greenvalley.com           | Admin@123
--  Board Member    | suresh@greenvalley.com          | Board@123
--  Landlord        | vikram@gmail.com                | Landlord@123
--  Tenant          | rajesh@gmail.com                | Tenant@123
--
-- ============================================================

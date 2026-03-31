-- Subscription limit fields
-- Run this in Supabase SQL editor

-- landlord_limit on societies: how many landlords this society can have (default 10)
ALTER TABLE societies ADD COLUMN IF NOT EXISTS landlord_limit INTEGER DEFAULT 10;

-- tenant_limit on users (landlord): how many tenants this landlord can have (default 5)
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_limit INTEGER DEFAULT 5;

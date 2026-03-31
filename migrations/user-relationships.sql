-- Add is_independent flag to users table
-- true = landlord registered without a society (self-registered)
-- false = landlord created by society admin (linked to a society)

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_independent BOOLEAN DEFAULT FALSE;

-- display_user_id is used for auto-generated login IDs (e.g. LND-1234, TNT-5678)
-- stored in admin_user_id column (already exists on users table)
-- Landlords and tenants can login via email OR their display_user_id

-- No other schema changes required: society link is via society_members,
-- flat link is via flats.owner_id (landlord) and flats.current_tenant_id + tenants table (tenant)

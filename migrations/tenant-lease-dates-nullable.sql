-- Bulk CSV import allows creating a tenant without lease_start/lease_end
-- filled in (landlord can fill them in later via Edit Tenant). Relax the
-- NOT NULL constraint on the live tenants table to match.
ALTER TABLE public.tenants
  ALTER COLUMN lease_start DROP NOT NULL,
  ALTER COLUMN lease_end DROP NOT NULL;

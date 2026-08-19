-- Late payment fee configuration, set per-tenant by the landlord.
-- fee_type: 'percentage' (of monthly rent, per day late) or 'fixed' (flat ₹ amount, per day late).

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS late_fee_type text CHECK (late_fee_type IN ('percentage', 'fixed')),
  ADD COLUMN IF NOT EXISTS late_fee_value numeric;

-- Snapshot the same late-fee terms onto the agreement, so a signed agreement
-- keeps its own record even if the tenant's live settings change later.
ALTER TABLE public.agreements
  ADD COLUMN IF NOT EXISTS late_fee_type text CHECK (late_fee_type IN ('percentage', 'fixed')),
  ADD COLUMN IF NOT EXISTS late_fee_value numeric;

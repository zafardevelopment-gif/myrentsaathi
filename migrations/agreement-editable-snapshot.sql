-- Agreements become an editable legal snapshot: tenant contact details, rent-hike
-- clause, and lease clauses are copied in at creation and can be edited afterwards
-- by the landlord without touching the live tenant/flat/rent_hike_history records.
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS tenant_name text;
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS tenant_phone text;
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS tenant_email text;
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS landlord_name text;
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS landlord_phone text;
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS landlord_email text;

-- Free-text rent escalation clause, e.g. "10% increase every 12 months, starting 1 Jun 2027".
-- Editable independently of rent_hike_history so the agreement text can diverge from
-- whatever the landlord later changes on the Rent Hike page.
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS rent_hike_clause text;

-- Editable lease terms & conditions (defaults to the standard clause set at creation,
-- stored as a jsonb array of strings so the landlord can add/edit/remove individual clauses).
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS clauses jsonb;

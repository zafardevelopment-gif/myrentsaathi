-- Let the landlord fully customize the generated agreement document: the brand
-- name and tagline shown above the title, the main title itself, and each
-- section's heading text (Parties, Property Details, Financial Terms, Terms &
-- Conditions). Defaults match the existing hardcoded copy so old agreements
-- render unchanged.
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS doc_brand text;
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS doc_title text;
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS doc_subtitle text;
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS section_titles jsonb;

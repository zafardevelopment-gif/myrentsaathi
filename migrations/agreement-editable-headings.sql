-- Let the landlord fully customize the generated agreement document: the main
-- title/subtitle shown at the top of the PDF, and each section's heading text
-- (Parties, Property Details, Financial Terms, Terms & Conditions). Defaults
-- match the existing hardcoded copy so old agreements render unchanged.
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS doc_title text;
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS doc_subtitle text;
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS section_titles jsonb;

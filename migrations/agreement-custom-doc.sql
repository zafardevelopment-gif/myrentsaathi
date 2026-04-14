-- Agreement Custom Document
-- Run in Supabase SQL Editor

ALTER TABLE agreements
  ADD COLUMN IF NOT EXISTS custom_doc_url  TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS custom_doc_name TEXT DEFAULT NULL;

-- Allow landlord to upload to agreements-docs bucket
-- Run this in Supabase Dashboard → Storage → Policies
-- OR via SQL:

-- Create storage bucket (if not exists) — run once
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('agreements-docs', 'agreements-docs', false)
-- ON CONFLICT DO NOTHING;

-- Storage policy: landlord can upload their own agreement docs
-- CREATE POLICY "Landlord upload agreement doc"
-- ON storage.objects FOR INSERT
-- WITH CHECK (bucket_id = 'agreements-docs');

-- Storage policy: authenticated users can read (tenant can download)
-- CREATE POLICY "Authenticated read agreement doc"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'agreements-docs' AND auth.role() = 'authenticated');

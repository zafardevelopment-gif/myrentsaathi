-- Agreements → "Upload Document" uploads to storage bucket "agreements-docs",
-- which doesn't exist yet → "Upload failed: Bucket not found".
-- Run once in Supabase → SQL Editor.

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('agreements-docs', 'agreements-docs', true, 10485760)  -- 10 MB
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "agreements-docs read"   ON storage.objects;
DROP POLICY IF EXISTS "agreements-docs insert" ON storage.objects;
DROP POLICY IF EXISTS "agreements-docs update" ON storage.objects;
DROP POLICY IF EXISTS "agreements-docs delete" ON storage.objects;

CREATE POLICY "agreements-docs read"   ON storage.objects FOR SELECT USING (bucket_id = 'agreements-docs');
CREATE POLICY "agreements-docs insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'agreements-docs');
-- upload() is called with upsert: true, which needs UPDATE as well
CREATE POLICY "agreements-docs update" ON storage.objects FOR UPDATE USING (bucket_id = 'agreements-docs');
CREATE POLICY "agreements-docs delete" ON storage.objects FOR DELETE USING (bucket_id = 'agreements-docs');

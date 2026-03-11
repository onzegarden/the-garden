-- ============================================================
-- The Garden — Supabase Storage Setup
-- ============================================================
--
-- STEP 1 — Create the bucket (Dashboard or API, NOT SQL)
-- -------------------------------------------------------
-- Go to: Supabase Dashboard → Storage → New bucket
--   Name  : inspirations
--   Public: ON  (so uploaded files are readable without auth)
--
-- Alternatively via Management API:
--   curl -X POST 'https://api.supabase.com/v1/projects/{ref}/storage/buckets' \
--     -H 'Authorization: Bearer {service_role_key}' \
--     -H 'Content-Type: application/json' \
--     -d '{"id":"inspirations","name":"inspirations","public":true}'
--
-- ============================================================

-- STEP 2 — Run the RLS policies below in the SQL Editor
-- ============================================================

-- Allow authenticated users to upload files into their own sub-folder
-- Files are stored as: {user_id}/{timestamp}-{random}.{ext}
create policy "Users can upload to own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'inspirations'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to update their own files (e.g. metadata)
create policy "Users can update own files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'inspirations'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to delete their own files
create policy "Users can delete own files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'inspirations'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow anyone (including unauthenticated visitors) to read public files.
-- This is required even for "public" buckets — Supabase still checks RLS
-- on the storage.objects table for SELECT.
create policy "Public can read files"
  on storage.objects for select
  to public
  using (bucket_id = 'inspirations');

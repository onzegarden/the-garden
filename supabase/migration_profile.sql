-- ============================================================
-- The Garden — Migration: Profile page
-- Run in your Supabase SQL Editor AFTER schema.sql
-- ============================================================

-- ── 1. Add missing columns to profiles ───────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio        TEXT,
  ADD COLUMN IF NOT EXISTS language   TEXT DEFAULT 'fr',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ── 2. Auto-update updated_at on every profile write ─────────
CREATE OR REPLACE FUNCTION public.handle_profile_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_profile_updated_at();

-- ── 3. INSERT policy (needed for upsert from the client) ─────
-- The handle_new_user trigger creates profiles via SECURITY DEFINER,
-- but upsert from the client needs an explicit INSERT policy.
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ── 4. Avatars bucket ─────────────────────────────────────────
-- STEP A — Create the bucket (do this via Dashboard or API, not SQL)
-- ------------------------------------------------------------------
-- Option A — Supabase Dashboard:
--   Storage → New bucket
--   Name   : avatars
--   Public : ON  (avatars are served publicly)
--
-- Option B — Management API (replace {ref} and {service_role_key}):
--   curl -X POST 'https://api.supabase.com/v1/projects/{ref}/storage/buckets' \
--     -H 'Authorization: Bearer {service_role_key}' \
--     -H 'Content-Type: application/json' \
--     -d '{"id":"avatars","name":"avatars","public":true}'
-- ------------------------------------------------------------------

-- STEP B — RLS policies for the avatars bucket (run in SQL Editor)
-- ------------------------------------------------------------------

-- Allow authenticated users to upload/replace their own avatar
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read access for avatar images
CREATE POLICY "Public can read avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

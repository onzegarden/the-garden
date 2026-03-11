-- ============================================================
-- The Garden — Archive Feature Migration
-- ============================================================
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- 1. Add the column (NOT NULL with default so existing rows get false)
ALTER TABLE inspirations
  ADD COLUMN is_archived boolean NOT NULL DEFAULT false;

-- 2. Index for faster archive-view queries
CREATE INDEX IF NOT EXISTS inspirations_is_archived_idx
  ON inspirations (is_archived);

-- 3. (Optional) Update RLS policies if you have row-level filtering —
--    the existing policies still apply; no changes needed here.

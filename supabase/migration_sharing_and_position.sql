-- ============================================================
-- The Garden — Migration: Sharing + Position
-- Run in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ── 1. Add sharing columns to gardens ────────────────────────
alter table public.gardens
  add column if not exists is_shared    boolean not null default false,
  add column if not exists share_token  text unique;

create index if not exists gardens_share_token_idx
  on public.gardens(share_token)
  where share_token is not null;

-- ── 2. Add position column to inspirations ───────────────────
alter table public.inspirations
  add column if not exists position integer not null default 0;

-- Seed positions from creation order (most recent = highest index)
with ranked as (
  select id,
         row_number() over (
           partition by user_id
           order by created_at asc
         ) - 1 as rn
  from public.inspirations
)
update public.inspirations i
set    position = r.rn
from   ranked r
where  i.id = r.id;

create index if not exists inspirations_position_idx
  on public.inspirations(user_id, position);

-- ── 3. Remove sharing columns from inspirations (cleanup) ────
alter table public.inspirations
  drop column if exists is_shared,
  drop column if exists share_token;

-- ── 4. RLS: public read on shared gardens ────────────────────
-- Drop first to avoid duplicate errors on re-run
drop policy if exists "Public can view shared gardens" on public.gardens;

create policy "Public can view shared gardens"
  on public.gardens
  for select
  using (is_shared = true);

-- ── 5. RLS: public read on inspirations of shared gardens ────
drop policy if exists "Public can view inspirations of shared gardens"
  on public.inspirations;

create policy "Public can view inspirations of shared gardens"
  on public.inspirations
  for select
  using (
    garden_id in (
      select id from public.gardens where is_shared = true
    )
  );

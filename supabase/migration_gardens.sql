-- ============================================================
-- The Garden — Migration: Gardens
-- Run AFTER schema.sql in your Supabase SQL Editor
-- ============================================================

-- ── Gardens table ────────────────────────────────────────────
create table public.gardens (
  id         uuid default uuid_generate_v4() primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  name       text not null default 'Mon Jardin',
  created_at timestamptz default now() not null
);

create index gardens_user_id_idx on public.gardens(user_id);

alter table public.gardens enable row level security;

create policy "Users can view own gardens"
  on public.gardens for select using (auth.uid() = user_id);

create policy "Users can insert own gardens"
  on public.gardens for insert with check (auth.uid() = user_id);

create policy "Users can update own gardens"
  on public.gardens for update using (auth.uid() = user_id);

create policy "Users can delete own gardens"
  on public.gardens for delete using (auth.uid() = user_id);

-- ── Add garden_id to inspirations ────────────────────────────
alter table public.inspirations
  add column garden_id uuid references public.gardens(id) on delete set null;

create index inspirations_garden_id_idx on public.inspirations(garden_id);

-- ── Update handle_new_user: create default garden ─────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Create profile
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );

  -- Create default garden
  insert into public.gardens (user_id, name)
  values (new.id, 'Mon Jardin');

  return new;
end;
$$;

-- ── Backfill: create default garden for existing users ────────
-- (Only run once if you already have users in production)
-- insert into public.gardens (user_id, name)
-- select id, 'Mon Jardin' from auth.users
-- where id not in (select distinct user_id from public.gardens);

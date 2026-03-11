-- ============================================================
-- The Garden — Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- Extended user data (linked to auth.users)
-- ============================================================
create table public.profiles (
  id         uuid references auth.users(id) on delete cascade primary key,
  email      text not null,
  full_name  text,
  avatar_url text,
  created_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

-- Profiles: users can only read/write their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- INSPIRATIONS
-- ============================================================
create type public.inspiration_type as enum ('image', 'text', 'link', 'video');

create table public.inspirations (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references auth.users(id) on delete cascade not null,
  type          public.inspiration_type not null default 'link',
  title         text,
  content_url   text,          -- URL for images/links/videos, or null for text
  source_url    text,          -- Original source link
  thumbnail_url text,          -- Preview image URL
  notes         text,          -- Personal note
  tags          text[] default '{}',
  is_favorite   boolean default false not null,
  created_at    timestamptz default now() not null,
  updated_at    timestamptz default now() not null
);

-- Index for faster queries
create index inspirations_user_id_idx on public.inspirations(user_id);
create index inspirations_created_at_idx on public.inspirations(created_at desc);
create index inspirations_type_idx on public.inspirations(type);
create index inspirations_tags_idx on public.inspirations using gin(tags);
create index inspirations_is_favorite_idx on public.inspirations(is_favorite);

-- Full text search index
create index inspirations_fts_idx on public.inspirations
  using gin(to_tsvector('french', coalesce(title, '') || ' ' || coalesce(notes, '')));

alter table public.inspirations enable row level security;

-- RLS Policies: users can only CRUD their own inspirations
create policy "Users can view own inspirations"
  on public.inspirations for select
  using (auth.uid() = user_id);

create policy "Users can insert own inspirations"
  on public.inspirations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own inspirations"
  on public.inspirations for update
  using (auth.uid() = user_id);

create policy "Users can delete own inspirations"
  on public.inspirations for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger inspirations_updated_at
  before update on public.inspirations
  for each row execute procedure public.handle_updated_at();

-- ============================================================
-- STORAGE BUCKETS (for image uploads)
-- Run separately or via Supabase Dashboard
-- ============================================================
-- insert into storage.buckets (id, name, public)
-- values ('inspiration-images', 'inspiration-images', false);
--
-- create policy "Users can upload own images"
--   on storage.objects for insert
--   with check (bucket_id = 'inspiration-images' and auth.uid()::text = (storage.foldername(name))[1]);
--
-- create policy "Users can view own images"
--   on storage.objects for select
--   using (bucket_id = 'inspiration-images' and auth.uid()::text = (storage.foldername(name))[1]);
--
-- create policy "Users can delete own images"
--   on storage.objects for delete
--   using (bucket_id = 'inspiration-images' and auth.uid()::text = (storage.foldername(name))[1]);

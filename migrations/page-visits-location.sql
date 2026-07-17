-- Add geo columns to page_visits, populated from Vercel's x-vercel-ip-* headers
-- Run in Supabase SQL Editor

alter table public.page_visits add column if not exists city text;
alter table public.page_visits add column if not exists region text;
alter table public.page_visits add column if not exists country text;

create index if not exists idx_page_visits_country on public.page_visits(country, created_at desc);

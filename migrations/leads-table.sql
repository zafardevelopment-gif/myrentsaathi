-- Outreach CRM: leads table for MyRentSaathi sales tracking.
-- Run this in the Supabase SQL editor to enable persistent lead storage.
-- (Until then, the superadmin/leads page uses an in-memory fallback.)

create table if not exists public.leads (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  type              text not null default 'society'
                      check (type in ('society','landlord','other')),
  contact_person    text,
  phone             text,
  email             text,
  city              text,
  source            text,
  status            text not null default 'new'
                      check (status in ('new','contacted','replied','demo','won','lost')),
  notes             text,
  last_contacted_at timestamptz,
  follow_up_at      timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists leads_status_idx    on public.leads (status);
create index if not exists leads_followup_idx   on public.leads (follow_up_at);
create index if not exists leads_created_idx     on public.leads (created_at desc);

-- RLS: this is internal superadmin data. The app uses the anon client, so allow
-- anon full access here (mirrors how other admin tables in this project are set
-- up). If you later add proper auth roles, tighten this.
alter table public.leads enable row level security;

drop policy if exists leads_all on public.leads;
create policy leads_all on public.leads
  for all
  to anon, authenticated
  using (true)
  with check (true);

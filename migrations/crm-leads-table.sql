-- Outreach CRM: crm_leads table for MyRentSaathi sales tracking.
-- Named crm_leads (NOT "leads") to avoid clashing with any existing table.
-- Run this whole block in the Supabase SQL editor.

create table if not exists public.crm_leads (
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

create index if not exists crm_leads_status_idx   on public.crm_leads (status);
create index if not exists crm_leads_followup_idx  on public.crm_leads (follow_up_at);
create index if not exists crm_leads_created_idx    on public.crm_leads (created_at desc);

-- RLS: internal superadmin data. App uses the anon client (like other admin
-- tables in this project), so allow anon+authenticated full access here.
alter table public.crm_leads enable row level security;

drop policy if exists crm_leads_all on public.crm_leads;
create policy crm_leads_all on public.crm_leads
  for all
  to anon, authenticated
  using (true)
  with check (true);

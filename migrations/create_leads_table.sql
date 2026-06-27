-- Lead capture table for homepage conversions
create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null,
  source      text not null default 'unknown',  -- 'hero_form' | 'exit_intent' | 'sticky_bar'
  contacted   boolean not null default false,
  notes       text,
  created_at  timestamptz not null default now()
);

-- RLS: service role inserts, authenticated superadmin reads
alter table public.leads enable row level security;

-- Anyone can insert (API route uses service role, but anon also allowed)
create policy "leads_insert" on public.leads
  for insert with check (true);

-- Only superadmin role can read/update leads
create policy "leads_superadmin_read" on public.leads
  for select using (
    exists (
      select 1 from users
      where users.id = auth.uid() and users.role = 'superadmin'
    )
  );

create policy "leads_superadmin_update" on public.leads
  for update using (
    exists (
      select 1 from users
      where users.id = auth.uid() and users.role = 'superadmin'
    )
  );

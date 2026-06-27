-- Lead capture table for homepage conversions
create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null,
  source      text not null default 'unknown',  -- 'hero_form' | 'exit_intent' | 'sticky_bar'
  contacted   boolean not null default false,
  notes       text,
  created_at  timestamptz not null default now()
);

-- Only superadmin can read/update leads
alter table public.leads enable row level security;

create policy "superadmin_all" on public.leads
  for all using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'superadmin'
    )
  );

-- Service role can insert (for API route)
create policy "service_insert" on public.leads
  for insert with check (true);

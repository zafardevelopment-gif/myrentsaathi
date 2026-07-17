-- promo_codes: super admin managed discount codes (checkout + superadmin/promos page)
-- Run this once in Supabase SQL editor

create table if not exists promo_codes (
  code         text primary key,
  type         text not null check (type in ('percentage', 'fixed')),
  value        numeric not null,
  max_uses     integer not null,
  used         integer not null default 0,
  min_plan     text not null default 'any',
  valid_till   date not null,
  status       text not null default 'active' check (status in ('active', 'expired', 'disabled')),
  savings      numeric not null default 0,
  created_by   text not null default 'Admin',
  revenue      numeric not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table promo_codes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'promo_codes' and policyname = 'service_role_full_access'
  ) then
    execute 'create policy "service_role_full_access" on promo_codes for all using (true) with check (true)';
  end if;
end$$;

-- Seed with the existing hardcoded promos so nothing is lost on cutover
insert into promo_codes (code, type, value, max_uses, used, min_plan, valid_till, status, savings, created_by, revenue) values
  ('LAUNCH50',   'percentage', 50,  500,  234, 'any',          '2026-04-30', 'active',  356000, 'System',               0),
  ('SOCIETY20',  'percentage', 20,  200,  89,  'professional', '2026-06-30', 'active',  120000, 'Admin',                0),
  ('FLAT1000',   'fixed',      1000,1000, 445, 'any',          '2026-12-31', 'active',  445000, 'System',               0),
  ('AGENTRAHUL', 'percentage', 10,  100,  45,  'any',          '2026-12-31', 'active',  45000,  'Agent: Rahul Verma',   185000),
  ('AGENTSNEHA', 'percentage', 10,  100,  28,  'any',          '2026-12-31', 'active',  28000,  'Agent: Sneha Kulkarni',100000),
  ('NRI30',      'percentage', 30,  100,  28,  'nri',          '2026-09-30', 'active',  42000,  'Admin',                0),
  ('DIWALI25',   'percentage', 25,  300,  300, 'any',          '2025-11-30', 'expired', 225000, 'System',               0),
  ('SUMMER10',   'percentage', 10,  400,  145, 'any',          '2026-08-31', 'active',  65000,  'Admin',                0),
  ('TEST95',     'percentage', 95,  500,  0,   'any',          '2026-06-30', 'active',  0,      'Admin',                0)
on conflict (code) do nothing;

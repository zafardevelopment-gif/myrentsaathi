-- platform_config: key-value store for super admin managed platform settings
-- Run this once in Supabase SQL editor

create table if not exists platform_config (
  key        text primary key,
  value      text not null default '',
  updated_at timestamptz not null default now()
);

alter table platform_config enable row level security;

-- Use IF NOT EXISTS to avoid error if policy already exists
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'platform_config' and policyname = 'service_role_full_access'
  ) then
    execute 'create policy "service_role_full_access" on platform_config for all using (true) with check (true)';
  end if;
end$$;

-- Seed empty rows so frontend shows fields immediately
insert into platform_config (key, value) values
  ('razorpay_key_id', ''),
  ('razorpay_key_secret', ''),
  ('razorpay_webhook_secret', ''),
  ('whatsapp_access_token', ''),
  ('whatsapp_phone_number_id', '')
on conflict (key) do nothing;

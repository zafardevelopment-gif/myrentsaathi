-- society_config: per-society Razorpay & WhatsApp keys
-- Run in Supabase SQL editor

create table if not exists society_config (
  society_id  uuid not null references societies(id) on delete cascade,
  key         text not null,
  value       text not null default '',
  updated_at  timestamptz not null default now(),
  primary key (society_id, key)
);

alter table society_config enable row level security;

create policy "service_role_full_access" on society_config
  for all using (true) with check (true);

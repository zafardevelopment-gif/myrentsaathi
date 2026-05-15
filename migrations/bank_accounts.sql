-- bank_accounts: stores bank details + Razorpay Route IDs for society admins & landlords
-- Run in Supabase SQL editor

create table if not exists bank_accounts (
  id                        uuid primary key default gen_random_uuid(),
  entity_type               text not null check (entity_type in ('society', 'landlord')),
  entity_id                 uuid not null,   -- society.id or users.id
  user_id                   uuid not null references users(id) on delete cascade,
  account_holder_name       text not null,
  account_number_masked     text not null,   -- e.g. ••••••••5678
  ifsc_code                 text not null,
  account_type              text not null default 'savings' check (account_type in ('savings', 'current')),
  pan_number                text,
  gst_number                text,
  razorpay_contact_id       text,            -- rzp contact id
  razorpay_fund_account_id  text,            -- rzp fund account id used for transfers
  is_verified               boolean not null default false,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  unique (entity_type, entity_id)            -- one bank account per society/landlord
);

alter table bank_accounts enable row level security;

create policy "service_role_full_access" on bank_accounts
  for all using (true) with check (true);

create index if not exists idx_bank_accounts_entity on bank_accounts (entity_type, entity_id);

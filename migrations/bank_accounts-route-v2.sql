-- Razorpay Route v2 (Linked Accounts) — extend bank_accounts.
-- Run AFTER bank_accounts.sql, in the Supabase SQL editor.

alter table bank_accounts
  add column if not exists razorpay_linked_account_id text,   -- acc_XXXX (Route linked account)
  add column if not exists razorpay_product_id        text,   -- acc_prod_XXXX (route product config)
  add column if not exists razorpay_stakeholder_id     text,   -- sth_XXXX
  add column if not exists route_status                text default 'pending'
      check (route_status in ('pending', 'created', 'needs_clarification', 'activated', 'failed')),
  add column if not exists business_type               text default 'individual',
  add column if not exists contact_email               text,
  add column if not exists contact_phone               text,
  add column if not exists address_street              text,
  add column if not exists address_city                text,
  add column if not exists address_state               text,
  add column if not exists address_postal_code         text,
  add column if not exists route_error                 text;   -- last onboarding error, if any

comment on column bank_accounts.razorpay_linked_account_id is 'Razorpay Route linked account id (acc_*) — transfers target this';
comment on column bank_accounts.route_status is 'pending|created|needs_clarification|activated|failed';

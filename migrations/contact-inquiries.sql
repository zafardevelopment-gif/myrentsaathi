-- Contact inquiries from the public /contact page
-- Run in Supabase SQL editor

create table if not exists contact_inquiries (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  contact    text not null,          -- email or phone
  user_type  text not null default 'Other',
  message    text not null,
  status     text not null default 'new'
               check (status in ('new', 'read', 'resolved')),
  created_at timestamptz not null default now()
);

alter table contact_inquiries enable row level security;

-- Public website can submit inquiries
create policy "anon insert contact_inquiries"
  on contact_inquiries for insert
  to anon
  with check (true);

-- SuperAdmin dashboard reads via anon key (same pattern as rest of superadmin-data.ts)
create policy "anon read contact_inquiries"
  on contact_inquiries for select
  to anon
  using (true);

-- SuperAdmin can update status
create policy "anon update contact_inquiries"
  on contact_inquiries for update
  to anon
  using (true);

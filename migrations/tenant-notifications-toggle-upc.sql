-- Per-tenant notification on/off switch (gates ALL automated WhatsApp/email
-- notifications to that tenant: welcome, credentials, rent reminders,
-- receipts, rent hike notices, agreement expiry notices, etc.)
alter table users
  add column if not exists notifications_enabled boolean not null default true;

-- Free-text reference/UPC number per property, landlord's own record only.
alter table flats
  add column if not exists upc_number text;

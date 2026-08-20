-- Notifications now default OFF for new tenants — landlord opts in per
-- tenant (or in bulk) from the Notification Status report, instead of
-- opting out after messages have already started going out.
ALTER TABLE public.users
  ALTER COLUMN notifications_enabled SET DEFAULT false;

-- Existing rows keep whatever value they already have; this only changes
-- the default applied to newly inserted rows going forward.

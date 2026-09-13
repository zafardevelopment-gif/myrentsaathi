-- ============================================================
-- BILLING MODULE — PHASE 13: Repeating "until paid" reminders
-- Run after billing-08-notifications.sql. Idempotent.
--
-- Client ask: send the rent reminder ~1 week before due date, then after
-- the due date keep sending automatic reminders daily/weekly until the
-- tenant pays. days_before / on_due_date / days_after already cover the
-- "before due" and fixed-offset cases; this adds an open-ended repeat that
-- fires every N days after the due date for as long as the invoice stays
-- unpaid/partially_paid/overdue (the invoice query in reminder-service.ts
-- already excludes paid/cancelled invoices, so this naturally stops once
-- the tenant pays — no extra "until paid" flag needed).
-- ============================================================

ALTER TABLE public.reminder_rules
  ADD COLUMN IF NOT EXISTS repeat_after_days integer; -- NULL = no repeat; e.g. 1 = daily, 7 = weekly

COMMENT ON COLUMN public.reminder_rules.repeat_after_days IS
  'After the due date, re-send a reminder every N days while the invoice remains unpaid. NULL disables repeating (fixed days_after list still applies).';

-- ============================================================
-- BILLING MODULE — PHASE 8: Notification queue + reminder rules
-- Run after billing-02-invoices.sql. Idempotent.
-- Design ref: docs/billing-invoice-module-design.md §10
-- ============================================================

-- 1. notification_queue
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel           text NOT NULL CHECK (channel IN ('email','whatsapp')),
  template          text NOT NULL,   -- invoice_generated | reminder_before | reminder_due | reminder_after | month_end
  recipient_user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  invoice_id        uuid REFERENCES public.invoices(id) ON DELETE CASCADE,
  payload           jsonb NOT NULL DEFAULT '{}'::jsonb,
  scheduled_for     timestamptz NOT NULL DEFAULT now(),
  scheduled_day     date NOT NULL DEFAULT current_date,   -- plain column for the dedupe index (timestamptz::date isn't IMMUTABLE)
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','cancelled')),
  attempts          integer NOT NULL DEFAULT 0,
  last_error        text,
  sent_at           timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);
-- For tables created by an earlier partial run, ensure the column exists.
ALTER TABLE public.notification_queue ADD COLUMN IF NOT EXISTS scheduled_day date NOT NULL DEFAULT current_date;
CREATE INDEX IF NOT EXISTS idx_notif_queue_pending ON public.notification_queue (status, scheduled_for);
-- Idempotency: one notification per (invoice, template, channel, day).
CREATE UNIQUE INDEX IF NOT EXISTS uq_notif_dedupe
  ON public.notification_queue (invoice_id, template, channel, scheduled_day)
  WHERE invoice_id IS NOT NULL;

-- 2. reminder_rules
CREATE TABLE IF NOT EXISTS public.reminder_rules (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id         uuid REFERENCES public.societies(id) ON DELETE CASCADE,
  landlord_id        uuid REFERENCES public.users(id)     ON DELETE CASCADE,
  invoice_type       text NOT NULL DEFAULT 'all',
  days_before        integer[] NOT NULL DEFAULT '{}',
  on_due_date        boolean NOT NULL DEFAULT true,
  days_after         integer[] NOT NULL DEFAULT '{}',
  month_end_followup boolean NOT NULL DEFAULT false,
  channels           text[] NOT NULL DEFAULT '{email}',
  is_active          boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reminder_rules_scope ON public.reminder_rules (COALESCE(society_id, landlord_id));

-- 3. RLS
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_rules     ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_access" ON public.notification_queue;
CREATE POLICY "open_access" ON public.notification_queue FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "open_access" ON public.reminder_rules;
CREATE POLICY "open_access" ON public.reminder_rules     FOR ALL USING (true) WITH CHECK (true);

-- Done. Phase 8 schema: notification_queue, reminder_rules.

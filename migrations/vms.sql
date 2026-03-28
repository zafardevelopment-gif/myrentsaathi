-- ============================================================
-- VISITOR MANAGEMENT SYSTEM (VMS)
-- Run in Supabase SQL Editor
-- ============================================================

-- ── visitors ───────────────────────────────────────────────
-- Master visitor registry, scoped per society + mobile
CREATE TABLE IF NOT EXISTS public.visitors (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id  uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  name        text NOT NULL,
  mobile      text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (society_id, mobile)
);

CREATE INDEX IF NOT EXISTS idx_visitors_society_mobile ON public.visitors(society_id, mobile);

-- ── visits ─────────────────────────────────────────────────
-- Each gate entry attempt
CREATE TABLE IF NOT EXISTS public.visits (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id       uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  visitor_id       uuid NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
  flat_number      text NOT NULL,
  block            text,
  purpose          text,
  vehicle_number   text,
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','approved','rejected','admin_override_approved','admin_override_rejected','exited')),
  is_pre_approved  boolean NOT NULL DEFAULT false,
  entry_time       timestamptz NOT NULL DEFAULT now(),
  exit_time        timestamptz,
  approved_at      timestamptz,
  approved_by      uuid REFERENCES public.users(id),
  approval_role    text CHECK (approval_role IN ('tenant','landlord','admin')),
  rejection_reason text,
  guard_id         uuid NOT NULL REFERENCES public.users(id),
  timeout_at       timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visits_society_status   ON public.visits(society_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visits_flat             ON public.visits(society_id, flat_number, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visits_guard            ON public.visits(guard_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visits_visitor          ON public.visits(visitor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visits_timeout          ON public.visits(timeout_at) WHERE status = 'pending';

-- ── pre_approved_visitors ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pre_approved_visitors (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  visitor_id   uuid NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
  society_id   uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  flat_number  text NOT NULL,
  label        text,                          -- e.g. "Maid", "Driver"
  valid_from   date NOT NULL DEFAULT CURRENT_DATE,
  valid_until  date,                          -- null = indefinite
  days_allowed int[],                         -- null = all days; 0=Sun..6=Sat
  time_from    time,                          -- null = anytime
  time_until   time,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (resident_id, visitor_id)
);

CREATE INDEX IF NOT EXISTS idx_pav_resident  ON public.pre_approved_visitors(resident_id, is_active);
CREATE INDEX IF NOT EXISTS idx_pav_visitor   ON public.pre_approved_visitors(visitor_id, is_active);
CREATE INDEX IF NOT EXISTS idx_pav_flat      ON public.pre_approved_visitors(society_id, flat_number, is_active);

-- ── approval_requests ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.approval_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id     uuid NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
  resident_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sent_at      timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  responded_at timestamptz,
  viewed_at    timestamptz,
  response     text CHECK (response IN ('approved','rejected','expired','admin_override'))
);

CREATE INDEX IF NOT EXISTS idx_approval_resident  ON public.approval_requests(resident_id, response) WHERE response IS NULL;
CREATE INDEX IF NOT EXISTS idx_approval_visit     ON public.approval_requests(visit_id);
CREATE INDEX IF NOT EXISTS idx_approval_expires   ON public.approval_requests(expires_at) WHERE response IS NULL;

-- ── visit_audit_log ────────────────────────────────────────
-- Append-only audit trail — never update or delete
CREATE TABLE IF NOT EXISTS public.visit_audit_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id   uuid NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
  actor_id   uuid REFERENCES public.users(id),
  actor_role text,
  action     text NOT NULL,    -- created|approved|rejected|exited|admin_override|pre_approved
  metadata   jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_visit ON public.visit_audit_log(visit_id, created_at DESC);

-- ── RLS ────────────────────────────────────────────────────
ALTER TABLE public.visitors              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_approved_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_audit_log       ENABLE ROW LEVEL SECURITY;

-- Open access (anon key) — same pattern as rest of app
CREATE POLICY "open_access" ON public.visitors              FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_access" ON public.visits                FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_access" ON public.pre_approved_visitors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_access" ON public.approval_requests     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_access" ON public.visit_audit_log       FOR ALL USING (true) WITH CHECK (true);

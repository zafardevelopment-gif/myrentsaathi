-- ============================================================
-- BILLING MODULE — PHASE 10: Invoice Template Designer
-- Run after billing-02-invoices.sql. Idempotent.
-- Design ref: docs/billing-invoice-module-design.md §25
-- ============================================================

CREATE TABLE IF NOT EXISTS public.invoice_templates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id   uuid REFERENCES public.societies(id) ON DELETE CASCADE,
  landlord_id  uuid REFERENCES public.users(id)     ON DELETE CASCADE,
  name         text NOT NULL,
  is_default   boolean NOT NULL DEFAULT false,
  applies_to   text NOT NULL DEFAULT 'all',   -- 'all' or a specific invoice_type
  config       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invoice_templates_scope ON public.invoice_templates (COALESCE(society_id, landlord_id));

-- Deferred FK: invoices.template_id → invoice_templates
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_invoices_template') THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT fk_invoices_template
      FOREIGN KEY (template_id) REFERENCES public.invoice_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.invoice_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_access" ON public.invoice_templates;
CREATE POLICY "open_access" ON public.invoice_templates FOR ALL USING (true) WITH CHECK (true);

-- Done. Phase 10 schema: invoice_templates.

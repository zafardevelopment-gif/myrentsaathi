-- ============================================================
-- BILLING MODULE — PHASE 12: Legacy backfill (rent/maintenance → invoices)
-- Run LAST, after billing-02 & billing-03. Idempotent (guarded by legacy_ref
-- AND by an existing flat+type+period invoice). NON-DESTRUCTIVE.
-- Design ref: docs/billing-invoice-module-design.md §12
-- ============================================================

-- -1. Invoice numbers are unique PER BILLER, not globally. billing-02 created a
--     GLOBAL unique on invoice_number; two billers each issuing RENT/FY/0001
--     collide there. Swap it for a per-biller unique index. Idempotent.
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_invoice_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_number_per_biller
  ON public.invoices (COALESCE(society_id, landlord_id), invoice_number);

-- 0. Make numbering NULL-safe (a biller key of NULL must match its own row,
--    not fall through to an endless seq=1). Replaces billing-02's version.
CREATE OR REPLACE FUNCTION public.next_doc_number(
  p_society uuid, p_landlord uuid, p_doc_type text, p_fy text, p_prefix text
) RETURNS text LANGUAGE plpgsql AS $$
DECLARE v_seq integer;
BEGIN
  UPDATE public.invoice_series
     SET next_seq = next_seq + 1
   WHERE COALESCE(society_id, landlord_id) IS NOT DISTINCT FROM COALESCE(p_society, p_landlord)
     AND doc_type = p_doc_type AND financial_year = p_fy
  RETURNING next_seq INTO v_seq;
  IF NOT FOUND THEN
    BEGIN
      INSERT INTO public.invoice_series (society_id, landlord_id, doc_type, financial_year, prefix, next_seq)
      VALUES (p_society, p_landlord, p_doc_type, p_fy, p_prefix, 1) RETURNING next_seq INTO v_seq;
    EXCEPTION WHEN unique_violation THEN
      UPDATE public.invoice_series SET next_seq = next_seq + 1
       WHERE COALESCE(society_id, landlord_id) IS NOT DISTINCT FROM COALESCE(p_society, p_landlord)
         AND doc_type = p_doc_type AND financial_year = p_fy
      RETURNING next_seq INTO v_seq;
    END;
  END IF;
  RETURN p_prefix || '/' || p_fy || '/' || lpad(v_seq::text, 4, '0');
END;
$$;

-- 1. Resync series counters to the max sequence already issued.
INSERT INTO public.invoice_series (society_id, landlord_id, doc_type, financial_year, prefix, next_seq)
SELECT society_id, landlord_id, invoice_type,
       split_part(invoice_number, '/', 2), split_part(invoice_number, '/', 1),
       MAX(split_part(invoice_number, '/', 3)::int)
FROM public.invoices
WHERE invoice_number LIKE '%/%/%'
GROUP BY society_id, landlord_id, invoice_type, split_part(invoice_number, '/', 2), split_part(invoice_number, '/', 1)
ON CONFLICT (COALESCE(society_id, landlord_id), doc_type, financial_year)
DO UPDATE SET next_seq = GREATEST(public.invoice_series.next_seq, EXCLUDED.next_seq);

DO $$
DECLARE
  r        record;
  v_inv    uuid;
  v_num    text;
  v_fy     text;
  v_lnd    uuid;
  v_soc    uuid;
  v_status text;
BEGIN
  -- ── RENT (biller = landlord/owner) ──────────────────────
  FOR r IN
    SELECT rp.*, t.user_id AS tenant_user_id, f.society_id AS flat_society, f.owner_id AS flat_owner
    FROM public.rent_payments rp
    LEFT JOIN public.tenants t ON t.id = rp.tenant_id
    LEFT JOIN public.flats f   ON f.id = rp.flat_id
    WHERE NOT EXISTS (SELECT 1 FROM public.invoices i WHERE i.legacy_ref = 'rent:' || rp.id)
      AND NOT EXISTS (SELECT 1 FROM public.invoices i
                      WHERE i.flat_id = rp.flat_id AND i.invoice_type = 'rent'
                        AND i.billing_period = rp.month_year AND i.status <> 'cancelled')
  LOOP
    v_lnd := COALESCE(r.landlord_id, r.flat_owner);
    v_soc := CASE WHEN v_lnd IS NULL THEN COALESCE(r.society_id, r.flat_society) END;
    IF v_lnd IS NULL AND v_soc IS NULL THEN CONTINUE; END IF;  -- no biller → skip

    v_fy := CASE WHEN substring(r.month_year, 6, 2)::int >= 4
                 THEN substring(r.month_year,1,4) || '-' || lpad(((substring(r.month_year,1,4)::int + 1) % 100)::text, 2, '0')
                 ELSE (substring(r.month_year,1,4)::int - 1)::text || '-' || lpad((substring(r.month_year,1,4)::int % 100)::text, 2, '0')
            END;
    v_num    := public.next_doc_number(v_soc, v_lnd, 'rent', v_fy, 'RENT');
    v_status := CASE r.status WHEN 'overdue' THEN 'overdue' ELSE 'unpaid' END;

    INSERT INTO public.invoices (
      invoice_number, invoice_type, society_id, landlord_id, flat_id, tenant_id,
      recipient_type, recipient_user_id, billing_period, issue_date, due_date,
      sub_total, total_amount, status, legacy_ref
    ) VALUES (
      v_num, 'rent', v_soc, v_lnd, r.flat_id, r.tenant_id,
      'tenant', r.tenant_user_id, r.month_year, COALESCE(r.due_date, (r.month_year || '-01')::date), r.due_date,
      COALESCE(r.expected_amount, r.amount, 0), COALESCE(r.expected_amount, r.amount, 0),
      v_status, 'rent:' || r.id
    ) RETURNING id INTO v_inv;

    INSERT INTO public.invoice_line_items (invoice_id, description, quantity, unit_rate, line_total)
    VALUES (v_inv, 'Rent — ' || r.month_year, 1, COALESCE(r.expected_amount, r.amount, 0), COALESCE(r.expected_amount, r.amount, 0));

    IF COALESCE(r.amount, 0) > 0 AND r.status = 'paid' THEN
      INSERT INTO public.invoice_payments (invoice_id, amount, payment_date, method, status, reference)
      VALUES (v_inv, r.amount, COALESCE(r.payment_date, current_date),
              COALESCE(NULLIF(r.payment_method, ''), 'cash'), 'confirmed', 'legacy rent:' || r.id);
    END IF;
  END LOOP;

  -- ── MAINTENANCE (biller = society) ──────────────────────
  -- NOTE: maintenance_payments uses column `period` (not month_year).
  FOR r IN
    SELECT mp.*, f.society_id AS flat_society
    FROM public.maintenance_payments mp
    LEFT JOIN public.flats f ON f.id = mp.flat_id
    WHERE NOT EXISTS (SELECT 1 FROM public.invoices i WHERE i.legacy_ref = 'mnt:' || mp.id)
      AND NOT EXISTS (SELECT 1 FROM public.invoices i
                      WHERE i.flat_id = mp.flat_id AND i.invoice_type = 'maintenance'
                        AND i.billing_period = mp.period AND i.status <> 'cancelled')
  LOOP
    v_soc := COALESCE(r.society_id, r.flat_society);
    IF v_soc IS NULL THEN CONTINUE; END IF;

    v_fy := CASE WHEN substring(r.period, 6, 2)::int >= 4
                 THEN substring(r.period,1,4) || '-' || lpad(((substring(r.period,1,4)::int + 1) % 100)::text, 2, '0')
                 ELSE (substring(r.period,1,4)::int - 1)::text || '-' || lpad((substring(r.period,1,4)::int % 100)::text, 2, '0')
            END;
    v_num    := public.next_doc_number(v_soc, NULL, 'maintenance', v_fy, 'MNT');
    v_status := CASE r.status WHEN 'overdue' THEN 'overdue' ELSE 'unpaid' END;

    INSERT INTO public.invoices (
      invoice_number, invoice_type, society_id, flat_id,
      recipient_type, recipient_user_id, billing_period, issue_date, due_date,
      sub_total, total_amount, status, legacy_ref
    ) VALUES (
      v_num, 'maintenance', v_soc, r.flat_id,
      'owner', r.payer_id, r.period, COALESCE(r.due_date, (r.period || '-01')::date), r.due_date,
      COALESCE(r.expected_amount, r.amount, 0), COALESCE(r.expected_amount, r.amount, 0),
      v_status, 'mnt:' || r.id
    ) RETURNING id INTO v_inv;

    INSERT INTO public.invoice_line_items (invoice_id, description, quantity, unit_rate, line_total)
    VALUES (v_inv, 'Maintenance — ' || r.period, 1, COALESCE(r.expected_amount, r.amount, 0), COALESCE(r.expected_amount, r.amount, 0));

    IF COALESCE(r.amount, 0) > 0 AND r.status = 'paid' THEN
      INSERT INTO public.invoice_payments (invoice_id, amount, payment_date, method, status, reference)
      VALUES (v_inv, r.amount, COALESCE(r.payment_date, current_date),
              COALESCE(NULLIF(r.payment_method, ''), 'cash'), 'confirmed', 'legacy mnt:' || r.id);
    END IF;
  END LOOP;

  RAISE NOTICE 'Legacy backfill complete.';
END $$;

-- Done. Phase 12: historical rent/maintenance mirrored into invoices (idempotent, NULL-safe numbering).

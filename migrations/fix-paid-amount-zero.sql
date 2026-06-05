-- Fix: paid rent rows whose `amount` is 0/NULL show ₹0 in the UI.
-- Cause: rows were inserted with amount=0 (pending), and the OLD verify route
-- marked them "paid" WITHOUT setting `amount`. The verify route is now fixed,
-- this backfills the historical rows.
-- Run in Supabase SQL Editor.

-- Rent: a paid row should carry the actually-paid value.
UPDATE rent_payments
SET amount = COALESCE(NULLIF(paid_amount, 0), expected_amount)
WHERE status = 'paid'
  AND (amount IS NULL OR amount = 0)
  AND COALESCE(NULLIF(paid_amount, 0), expected_amount) > 0;

-- Society dues: same defensive backfill (after society-due-receipt.sql has run).
UPDATE society_due_payments
SET amount = COALESCE(NULLIF(paid_amount, 0), expected_amount, amount)
WHERE COALESCE(status, 'paid') = 'paid'
  AND (amount IS NULL OR amount = 0)
  AND COALESCE(NULLIF(paid_amount, 0), expected_amount, 0) > 0;

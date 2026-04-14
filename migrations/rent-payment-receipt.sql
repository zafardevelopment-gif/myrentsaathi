-- Migration: Add manual receipt upload fields to rent_payments
-- Run this in Supabase SQL Editor

ALTER TABLE rent_payments
  ADD COLUMN IF NOT EXISTS receipt_url       TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS receipt_name      TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS receipt_status    TEXT DEFAULT NULL,  -- 'pending_verification' | 'accepted' | 'rejected'
  ADD COLUMN IF NOT EXISTS paid_amount       NUMERIC DEFAULT NULL; -- for partial payments

-- Index for landlord querying pending verifications efficiently
CREATE INDEX IF NOT EXISTS idx_rent_payments_receipt_status
  ON rent_payments (receipt_status)
  WHERE receipt_status IS NOT NULL;

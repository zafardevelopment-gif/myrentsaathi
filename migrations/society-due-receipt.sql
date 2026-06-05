-- Migration: Add manual receipt upload + partial payment fields to society_due_payments
-- Mirrors rent-payment-receipt.sql so landlords can pay maintenance via
-- Gateway / Upload Receipt / Partial (same modal as tenant rent).
-- Run this in Supabase SQL Editor.

ALTER TABLE society_due_payments
  ADD COLUMN IF NOT EXISTS expected_amount  NUMERIC DEFAULT NULL,  -- full share for this expense+flat
  ADD COLUMN IF NOT EXISTS paid_amount      NUMERIC DEFAULT NULL,  -- amount paid so far (partial)
  ADD COLUMN IF NOT EXISTS status           TEXT    DEFAULT 'paid',-- 'paid' | 'pending'
  ADD COLUMN IF NOT EXISTS receipt_url      TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS receipt_name     TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS receipt_status   TEXT    DEFAULT NULL;  -- 'pending_verification' | 'accepted' | 'rejected'

-- Existing rows were all gateway-paid in full; backfill so they stay "paid".
UPDATE society_due_payments
  SET status = 'paid'
  WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS idx_society_due_payments_receipt_status
  ON society_due_payments (receipt_status)
  WHERE receipt_status IS NOT NULL;

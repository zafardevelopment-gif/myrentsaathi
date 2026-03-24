-- ============================================================
-- Run this in your Supabase SQL Editor
-- Adds superadmin_bypass policies so anon key can do full CRUD
-- (Until real Supabase Auth is wired up)
-- ============================================================

-- Allow anon to SELECT on all superadmin-needed tables
-- (societies, users, flats, tickets, whatsapp_logs, agreements already allow SELECT via empty RLS)

-- Allow anon full access to societies (superadmin writes)
CREATE POLICY "superadmin_full_access_societies" ON public.societies
  FOR ALL USING (true) WITH CHECK (true);

-- Allow anon full access to users
CREATE POLICY "superadmin_full_access_users" ON public.users
  FOR ALL USING (true) WITH CHECK (true);

-- Allow anon full access to flats
CREATE POLICY "superadmin_full_access_flats" ON public.flats
  FOR ALL USING (true) WITH CHECK (true);

-- Allow anon full access to society_members
CREATE POLICY "superadmin_full_access_members" ON public.society_members
  FOR ALL USING (true) WITH CHECK (true);

-- Allow anon full access to tickets
CREATE POLICY "superadmin_full_access_tickets" ON public.tickets
  FOR ALL USING (true) WITH CHECK (true);

-- Allow anon full access to rent_payments
CREATE POLICY "superadmin_full_access_rent" ON public.rent_payments
  FOR ALL USING (true) WITH CHECK (true);

-- Allow anon full access to maintenance_payments
CREATE POLICY "superadmin_full_access_maint" ON public.maintenance_payments
  FOR ALL USING (true) WITH CHECK (true);

-- Allow anon full access to society_expenses
CREATE POLICY "superadmin_full_access_expenses" ON public.society_expenses
  FOR ALL USING (true) WITH CHECK (true);

-- Allow anon full access to notices
CREATE POLICY "superadmin_full_access_notices" ON public.notices
  FOR ALL USING (true) WITH CHECK (true);

-- Allow anon full access to documents
CREATE POLICY "superadmin_full_access_documents" ON public.documents
  FOR ALL USING (true) WITH CHECK (true);

-- Allow anon full access to whatsapp_logs
CREATE POLICY "superadmin_full_access_wa" ON public.whatsapp_logs
  FOR ALL USING (true) WITH CHECK (true);

-- Allow anon full access to agreements
CREATE POLICY "superadmin_full_access_agreements" ON public.agreements
  FOR ALL USING (true) WITH CHECK (true);

-- Allow anon full access to audit_logs
CREATE POLICY "superadmin_full_access_audit" ON public.audit_logs
  FOR ALL USING (true) WITH CHECK (true);

-- Allow anon full access to parking_slots
CREATE POLICY "superadmin_full_access_parking" ON public.parking_slots
  FOR ALL USING (true) WITH CHECK (true);

-- Allow anon full access to polls
CREATE POLICY "superadmin_full_access_polls" ON public.polls
  FOR ALL USING (true) WITH CHECK (true);

-- Allow anon full access to poll_votes
CREATE POLICY "superadmin_full_access_poll_votes" ON public.poll_votes
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- MyRentSaathi — New Society Complete Setup Script
-- Run this in Supabase SQL Editor
-- Creates 1 society with admin, board, landlords, tenants,
-- flats, payments, tickets, notices, parking, polls
-- ============================================================
-- INSTRUCTIONS:
-- 1. Change the values in the CONFIGURATION block below
-- 2. Run full script in Supabase SQL Editor
-- ============================================================

DO $$
DECLARE
  -- ══════════════════════════════════════════════
  -- CONFIGURATION — CHANGE THESE VALUES
  -- ══════════════════════════════════════════════

  -- Society Details
  v_society_name        TEXT := 'Green Valley CHS';
  v_society_address     TEXT := 'Plot 45, Sector 21, Andheri West';
  v_society_city        TEXT := 'Mumbai';
  v_society_state       TEXT := 'Maharashtra';
  v_society_pincode     TEXT := '400058';
  v_society_reg_number  TEXT := 'MH/HSG/2024/0001';
  v_total_flats         INT  := 120;
  v_total_floors        INT  := 12;
  v_maintenance_amount  NUMERIC := 3500;
  v_subscription_plan   TEXT := 'pro';

  -- Society Admin Login
  v_admin_email         TEXT := 'admin@greenvalley.com';
  v_admin_name          TEXT := 'Ramesh Patil';
  v_admin_phone         TEXT := '+919800100001';

  -- Board Member
  v_board_email         TEXT := 'suresh@greenvalley.com';
  v_board_name          TEXT := 'Suresh Kumar';
  v_board_phone         TEXT := '+919800200001';
  v_board_designation   TEXT := 'Secretary';

  -- Landlord 1
  v_landlord1_email     TEXT := 'vikram@gmail.com';
  v_landlord1_name      TEXT := 'Vikram Malhotra';
  v_landlord1_phone     TEXT := '+919800300001';

  -- Landlord 2
  v_landlord2_email     TEXT := 'priyanka@gmail.com';
  v_landlord2_name      TEXT := 'Priyanka Desai';
  v_landlord2_phone     TEXT := '+919800300002';

  -- Tenant 1 (lives in Flat A-101, owned by Landlord 1)
  v_tenant1_email       TEXT := 'rajesh@gmail.com';
  v_tenant1_name        TEXT := 'Rajesh Sharma';
  v_tenant1_phone       TEXT := '+919800400001';

  -- Tenant 2 (lives in Flat A-102, owned by Landlord 1)
  v_tenant2_email       TEXT := 'kavita@gmail.com';
  v_tenant2_name        TEXT := 'Kavita Singh';
  v_tenant2_phone       TEXT := '+919800400002';

  -- ══════════════════════════════════════════════
  -- INTERNAL VARIABLES — DO NOT CHANGE
  -- ══════════════════════════════════════════════
  v_society_id    UUID;
  v_admin_id      UUID;
  v_board_id      UUID;
  v_landlord1_id  UUID;
  v_landlord2_id  UUID;
  v_tenant1_id    UUID;
  v_tenant2_id    UUID;
  v_flat1_id      UUID;
  v_flat2_id      UUID;
  v_flat3_id      UUID;
  v_flat4_id      UUID;
  v_db_tenant1_id UUID;
  v_db_tenant2_id UUID;

BEGIN

  RAISE NOTICE '🏢 Creating society: %', v_society_name;

  -- ══════════════════════════════════════════════
  -- 1. SOCIETY
  -- ══════════════════════════════════════════════
  INSERT INTO public.societies (
    name, address, city, state, pincode, registration_number,
    total_flats, total_floors, subscription_plan,
    maintenance_amount, maintenance_due_day, is_active
  ) VALUES (
    v_society_name, v_society_address, v_society_city, v_society_state,
    v_society_pincode, v_society_reg_number,
    v_total_flats, v_total_floors, v_subscription_plan,
    v_maintenance_amount, 5, true
  )
  RETURNING id INTO v_society_id;

  RAISE NOTICE '✅ Society created: %', v_society_id;

  -- ══════════════════════════════════════════════
  -- 2. USERS
  -- ══════════════════════════════════════════════

  -- Admin
  INSERT INTO public.users (email, full_name, phone, role, is_active)
  VALUES (v_admin_email, v_admin_name, v_admin_phone, 'society_admin', true)
  ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone
  RETURNING id INTO v_admin_id;

  -- Board
  INSERT INTO public.users (email, full_name, phone, role, is_active)
  VALUES (v_board_email, v_board_name, v_board_phone, 'board_member', true)
  ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone
  RETURNING id INTO v_board_id;

  -- Landlord 1
  INSERT INTO public.users (email, full_name, phone, role, is_active)
  VALUES (v_landlord1_email, v_landlord1_name, v_landlord1_phone, 'landlord', true)
  ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone
  RETURNING id INTO v_landlord1_id;

  -- Landlord 2
  INSERT INTO public.users (email, full_name, phone, role, is_active)
  VALUES (v_landlord2_email, v_landlord2_name, v_landlord2_phone, 'landlord', true)
  ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone
  RETURNING id INTO v_landlord2_id;

  -- Tenant 1
  INSERT INTO public.users (email, full_name, phone, role, is_active)
  VALUES (v_tenant1_email, v_tenant1_name, v_tenant1_phone, 'tenant', true)
  ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone
  RETURNING id INTO v_tenant1_id;

  -- Tenant 2
  INSERT INTO public.users (email, full_name, phone, role, is_active)
  VALUES (v_tenant2_email, v_tenant2_name, v_tenant2_phone, 'tenant', true)
  ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone
  RETURNING id INTO v_tenant2_id;

  RAISE NOTICE '✅ Users created: admin=%, board=%, l1=%, l2=%, t1=%, t2=%',
    v_admin_id, v_board_id, v_landlord1_id, v_landlord2_id, v_tenant1_id, v_tenant2_id;

  -- ══════════════════════════════════════════════
  -- 3. FLATS
  -- ══════════════════════════════════════════════

  -- Flat A-101 — Landlord1, Tenant1 (occupied)
  INSERT INTO public.flats (
    society_id, flat_number, block, floor_number, flat_type,
    area_sqft, monthly_rent, security_deposit, maintenance_amount,
    owner_id, current_tenant_id, status
  ) VALUES (
    v_society_id, 'A-101', 'A', 1, '2BHK',
    950, 28000, 56000, v_maintenance_amount,
    v_landlord1_id, v_tenant1_id, 'occupied'
  ) RETURNING id INTO v_flat1_id;

  -- Flat A-102 — Landlord1, Tenant2 (occupied)
  INSERT INTO public.flats (
    society_id, flat_number, block, floor_number, flat_type,
    area_sqft, monthly_rent, security_deposit, maintenance_amount,
    owner_id, current_tenant_id, status
  ) VALUES (
    v_society_id, 'A-102', 'A', 1, '2BHK',
    920, 27000, 54000, v_maintenance_amount,
    v_landlord1_id, v_tenant2_id, 'occupied'
  ) RETURNING id INTO v_flat2_id;

  -- Flat B-201 — Landlord2, vacant
  INSERT INTO public.flats (
    society_id, flat_number, block, floor_number, flat_type,
    area_sqft, monthly_rent, security_deposit, maintenance_amount,
    owner_id, current_tenant_id, status
  ) VALUES (
    v_society_id, 'B-201', 'B', 2, '3BHK',
    1300, 45000, 90000, v_maintenance_amount,
    v_landlord2_id, null, 'vacant'
  ) RETURNING id INTO v_flat3_id;

  -- Flat B-301 — Landlord2, vacant
  INSERT INTO public.flats (
    society_id, flat_number, block, floor_number, flat_type,
    area_sqft, monthly_rent, security_deposit, maintenance_amount,
    owner_id, current_tenant_id, status
  ) VALUES (
    v_society_id, 'B-301', 'B', 3, '2BHK',
    900, 26000, 52000, v_maintenance_amount,
    v_landlord2_id, null, 'vacant'
  ) RETURNING id INTO v_flat4_id;

  RAISE NOTICE '✅ Flats created: %, %, %, %', v_flat1_id, v_flat2_id, v_flat3_id, v_flat4_id;

  -- ══════════════════════════════════════════════
  -- 4. SOCIETY MEMBERS
  -- ══════════════════════════════════════════════

  INSERT INTO public.society_members (society_id, user_id, role, designation)
  VALUES
    (v_society_id, v_admin_id,     'admin',    'Society Admin'),
    (v_society_id, v_board_id,     'board',    v_board_designation),
    (v_society_id, v_landlord1_id, 'landlord', null),
    (v_society_id, v_landlord2_id, 'landlord', null),
    (v_society_id, v_tenant1_id,   'tenant',   null),
    (v_society_id, v_tenant2_id,   'tenant',   null);

  RAISE NOTICE '✅ Society members linked';

  -- ══════════════════════════════════════════════
  -- 5. TENANTS TABLE
  -- ══════════════════════════════════════════════

  INSERT INTO public.tenants (
    user_id, society_id, flat_id, landlord_id,
    move_in_date, lease_start, lease_end,
    monthly_rent, security_deposit, status
  ) VALUES (
    v_tenant1_id, v_society_id, v_flat1_id, v_landlord1_id,
    '2025-10-01', '2025-10-01', '2026-09-30',
    28000, 56000, 'active'
  ) RETURNING id INTO v_db_tenant1_id;

  INSERT INTO public.tenants (
    user_id, society_id, flat_id, landlord_id,
    move_in_date, lease_start, lease_end,
    monthly_rent, security_deposit, status
  ) VALUES (
    v_tenant2_id, v_society_id, v_flat2_id, v_landlord1_id,
    '2025-11-01', '2025-11-01', '2026-10-31',
    27000, 54000, 'active'
  ) RETURNING id INTO v_db_tenant2_id;

  RAISE NOTICE '✅ Tenants created: %, %', v_db_tenant1_id, v_db_tenant2_id;

  -- ══════════════════════════════════════════════
  -- 6. RENT PAYMENTS (last 3 months)
  -- ══════════════════════════════════════════════

  INSERT INTO public.rent_payments (
    tenant_id, flat_id, landlord_id, society_id,
    amount, expected_amount, month_year,
    due_date, payment_date, status, payment_method
  ) VALUES
    -- Tenant 1 (Rajesh) payments
    (v_db_tenant1_id, v_flat1_id, v_landlord1_id, v_society_id, 28000, 28000, '2026-01', '2026-01-05', '2026-01-03', 'paid', 'upi'),
    (v_db_tenant1_id, v_flat1_id, v_landlord1_id, v_society_id, 28000, 28000, '2026-02', '2026-02-05', '2026-02-04', 'paid', 'upi'),
    (v_db_tenant1_id, v_flat1_id, v_landlord1_id, v_society_id, 0,     28000, '2026-03', '2026-03-05', null,         'overdue', null),
    -- Tenant 2 (Kavita) payments
    (v_db_tenant2_id, v_flat2_id, v_landlord1_id, v_society_id, 27000, 27000, '2026-01', '2026-01-05', '2026-01-06', 'paid', 'bank_transfer'),
    (v_db_tenant2_id, v_flat2_id, v_landlord1_id, v_society_id, 27000, 27000, '2026-02', '2026-02-05', '2026-02-07', 'paid', 'bank_transfer'),
    (v_db_tenant2_id, v_flat2_id, v_landlord1_id, v_society_id, 0,     27000, '2026-03', '2026-03-05', null,         'pending', null)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '✅ Rent payments created';

  -- ══════════════════════════════════════════════
  -- 7. MAINTENANCE PAYMENTS
  -- ══════════════════════════════════════════════

  INSERT INTO public.maintenance_payments (
    society_id, flat_id, payer_id,
    amount, expected_amount, period, month_year,
    due_date, payment_date, status, payment_method
  ) VALUES
    (v_society_id, v_flat1_id, v_tenant1_id,   3500, 3500, '2026-01', '2026-01', '2026-01-05', '2026-01-03', 'paid',    'upi'),
    (v_society_id, v_flat1_id, v_tenant1_id,   3500, 3500, '2026-02', '2026-02', '2026-02-05', '2026-02-03', 'paid',    'upi'),
    (v_society_id, v_flat1_id, v_tenant1_id,   0,    3500, '2026-03', '2026-03', '2026-03-05', null,         'pending', null),
    (v_society_id, v_flat2_id, v_tenant2_id,   3500, 3500, '2026-02', '2026-02', '2026-02-05', '2026-02-06', 'paid',    'upi'),
    (v_society_id, v_flat2_id, v_tenant2_id,   0,    3500, '2026-03', '2026-03', '2026-03-05', null,         'overdue', null),
    (v_society_id, v_flat3_id, v_landlord2_id, 0,    3500, '2026-03', '2026-03', '2026-03-05', null,         'overdue', null);

  RAISE NOTICE '✅ Maintenance payments created';

  -- ══════════════════════════════════════════════
  -- 8. TICKETS
  -- ══════════════════════════════════════════════

  INSERT INTO public.tickets (
    society_id, flat_id, raised_by, category, subject, description, priority, status
  ) VALUES
    (v_society_id, v_flat1_id, v_tenant1_id, 'lift',       'Lift B stuck on 2nd floor',    'Lift B has been stuck since morning. Residents are using stairs.',          'urgent', 'open'),
    (v_society_id, v_flat2_id, v_tenant2_id, 'plumbing',   'Water leakage in kitchen',     'Pipe under kitchen sink is leaking badly.',                                'high',   'in_progress'),
    (v_society_id, v_flat1_id, v_tenant1_id, 'security',   'Main gate CCTV not working',   'CCTV camera at main gate has been off since 3 days.',                      'high',   'open'),
    (v_society_id, v_flat2_id, v_tenant2_id, 'electrical', 'Power fluctuation in flat',    'Frequent power fluctuations causing damage to appliances.',                'medium', 'assigned'),
    (v_society_id, null,       v_admin_id,   'cleaning',   'Common area not cleaned',      'Lobby area not cleaned for 2 days.',                                       'low',    'resolved');

  RAISE NOTICE '✅ Tickets created';

  -- ══════════════════════════════════════════════
  -- 9. NOTICES
  -- ══════════════════════════════════════════════

  INSERT INTO public.notices (
    society_id, title, content, notice_type, target_audience, created_by, send_whatsapp, is_active
  ) VALUES
    (v_society_id, 'Annual General Meeting',
     'AGM scheduled for 5th April 2026 at 6 PM in community hall. All members must attend.',
     'event', 'all', v_admin_id, true, true),

    (v_society_id, 'March Maintenance Due',
     'March 2026 maintenance of ₹3,500 is due by 5th March. Pay via UPI or online portal.',
     'financial', 'all', v_admin_id, true, true),

    (v_society_id, 'Water Supply Interruption',
     'Water supply will be off on 28 March from 10 AM to 2 PM for overhead tank cleaning.',
     'maintenance', 'all', v_admin_id, false, true),

    (v_society_id, 'No Parking in Fire Lane',
     'Vehicles parked in fire lanes will be towed without notice. Please use designated slots.',
     'general', 'all', v_admin_id, false, true);

  RAISE NOTICE '✅ Notices created';

  -- ══════════════════════════════════════════════
  -- 10. PARKING SLOTS
  -- ══════════════════════════════════════════════

  INSERT INTO public.parking_slots (
    society_id, slot_number, slot_type, level, status, flat_id, vehicle_number, vehicle_model
  ) VALUES
    (v_society_id, 'P-01', 'car',   'Ground', 'occupied', v_flat1_id, 'MH 01 AB 1234', 'Maruti Swift'),
    (v_society_id, 'P-02', 'car',   'Ground', 'occupied', v_flat2_id, 'MH 01 CD 5678', 'Honda City'),
    (v_society_id, 'P-03', 'car',   'Ground', 'available', null, null, null),
    (v_society_id, 'P-04', 'car',   'Ground', 'available', null, null, null),
    (v_society_id, 'P-05', 'bike',  'Ground', 'occupied', v_flat1_id, 'MH 01 EF 9999', 'Activa 6G'),
    (v_society_id, 'P-06', 'bike',  'Ground', 'available', null, null, null),
    (v_society_id, 'P-B1', 'car',   'Basement', 'available', null, null, null),
    (v_society_id, 'P-B2', 'car',   'Basement', 'occupied', v_flat3_id, 'MH 02 XY 4321', 'Toyota Innova');

  RAISE NOTICE '✅ Parking slots created';

  -- ══════════════════════════════════════════════
  -- 11. SOCIETY EXPENSES
  -- ══════════════════════════════════════════════

  INSERT INTO public.society_expenses (
    society_id, category, description, vendor_name,
    amount, expense_date, approval_status, approved_by
  ) VALUES
    (v_society_id, 'security',    'Monthly security guard charges',          'Suraksha Security',  45000, '2026-03-01', 'approved',  v_admin_id),
    (v_society_id, 'cleaning',    'Monthly housekeeping + garbage disposal', 'CleanPro Services',  28000, '2026-03-01', 'approved',  v_admin_id),
    (v_society_id, 'electrical',  'Lift AMC annual contract',                'Otis Elevators',     18000, '2026-03-05', 'pending',   null),
    (v_society_id, 'plumbing',    'Water pump motor repair',                 'Shri Ram Plumbing',   8500, '2026-03-10', 'approved',  v_admin_id),
    (v_society_id, 'garden',      'Garden maintenance & plants',             'Green Fingers',       5000, '2026-03-15', 'pending',   null),
    (v_society_id, 'electrical',  'Common area lights replacement',          'Bright Electricals',  3200, '2026-03-18', 'rejected',  v_admin_id);

  RAISE NOTICE '✅ Society expenses created';

  -- ══════════════════════════════════════════════
  -- 12. AGREEMENTS
  -- ══════════════════════════════════════════════

  INSERT INTO public.agreements (
    flat_id, landlord_id, tenant_id, society_id,
    city, agreement_type, tier,
    start_date, end_date,
    monthly_rent, security_deposit, status
  ) VALUES
    (v_flat1_id, v_landlord1_id, v_db_tenant1_id, v_society_id,
     v_society_city, 'leave_license', 'lawyer_verified',
     '2025-10-01', '2026-09-30', 28000, 56000, 'active'),

    (v_flat2_id, v_landlord1_id, v_db_tenant2_id, v_society_id,
     v_society_city, 'leave_license', 'free',
     '2025-11-01', '2026-10-31', 27000, 54000, 'active');

  RAISE NOTICE '✅ Agreements created';

  -- ══════════════════════════════════════════════
  -- 13. POLLS (with options)
  -- ══════════════════════════════════════════════
  DECLARE
    v_poll1_id UUID;
    v_poll2_id UUID;
  BEGIN
    INSERT INTO public.polls (society_id, title, description, status, target_audience, ends_at, created_by)
    VALUES (
      v_society_id,
      'Best time for AGM meeting?',
      'Vote for the most convenient time slot for Annual General Meeting.',
      'active', 'all',
      NOW() + INTERVAL '15 days',
      v_admin_id
    ) RETURNING id INTO v_poll1_id;

    INSERT INTO public.poll_options (poll_id, option_text, sort_order) VALUES
      (v_poll1_id, 'Saturday 5 PM',  1),
      (v_poll1_id, 'Sunday 10 AM',   2),
      (v_poll1_id, 'Sunday 5 PM',    3),
      (v_poll1_id, 'Weekday Evening', 4);

    INSERT INTO public.polls (society_id, title, description, status, target_audience, ends_at, created_by)
    VALUES (
      v_society_id,
      'Install CCTV in parking area?',
      'Board members to vote on installing 4 additional CCTV cameras in the parking area.',
      'active', 'board',
      NOW() + INTERVAL '7 days',
      v_admin_id
    ) RETURNING id INTO v_poll2_id;

    INSERT INTO public.poll_options (poll_id, option_text, sort_order) VALUES
      (v_poll2_id, 'Yes, install immediately', 1),
      (v_poll2_id, 'Yes, but next quarter',    2),
      (v_poll2_id, 'No, not required',         3);

    RAISE NOTICE '✅ Polls created: %, %', v_poll1_id, v_poll2_id;
  END;

  -- ══════════════════════════════════════════════
  -- 14. AUDIT LOGS
  -- ══════════════════════════════════════════════

  INSERT INTO public.audit_logs (society_id, action, entity_type, performed_by)
  VALUES
    (v_society_id, 'society_created',    'society',          v_admin_id),
    (v_society_id, 'member_added',       'society_members',  v_admin_id),
    (v_society_id, 'notice_created',     'notices',          v_admin_id),
    (v_society_id, 'expense_approved',   'society_expenses', v_admin_id),
    (v_society_id, 'ticket_resolved',    'tickets',          v_board_id),
    (v_society_id, 'poll_created',       'polls',            v_admin_id);

  RAISE NOTICE '✅ Audit logs created';

  -- ══════════════════════════════════════════════
  -- DONE
  -- ══════════════════════════════════════════════
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Society setup complete!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Society ID  : %', v_society_id;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'LOGIN CREDENTIALS:';
  RAISE NOTICE '  Admin    : % / Admin@123', v_admin_email;
  RAISE NOTICE '  Board    : % / Board@123', v_board_email;
  RAISE NOTICE '  Landlord : % / Landlord@123', v_landlord1_email;
  RAISE NOTICE '  Tenant   : % / Tenant@123', v_tenant1_email;
  RAISE NOTICE '  Tenant 2 : % / Tenant@456', v_tenant2_email;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

END $$;

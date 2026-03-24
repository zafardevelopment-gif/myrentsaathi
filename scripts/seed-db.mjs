/**
 * MyRentSaathi — Database Seed Script
 * Run: node scripts/seed-db.mjs
 * Seeds societies, users, flats, tenants, payments, tickets, notices, wa_logs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://iqtbwznmjwipqzbxwgtz.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxdGJ3em5tandpcHF6Ynh3Z3R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MTM0NjEsImV4cCI6MjA4MzI4OTQ2MX0.58S_eJLmGYGdyz280WFwg3p2YfzvFvu_Ct95F7QtUI0'

const sb = createClient(SUPABASE_URL, ANON_KEY)

async function run(label, promise) {
  const r = await promise
  if (r.error) {
    console.error(`❌ ${label}:`, r.error.message, r.error.code)
    return null
  }
  console.log(`✅ ${label}: ${Array.isArray(r.data) ? r.data.length : 1} rows`)
  return r.data
}

// ─── SOCIETIES ────────────────────────────────────────────────
const SOCIETIES_DATA = [
  { name: 'Green Valley CHS', address: 'Plot 45, Sector 21, Andheri West', city: 'Mumbai', state: 'Maharashtra', pincode: '400058', registration_number: 'MH/HSG/2019/4521', total_flats: 120, total_floors: 12, subscription_plan: 'enterprise', maintenance_amount: 3500, maintenance_due_day: 5, is_active: true },
  { name: 'Sunshine Towers', address: 'Near IT Park, Hinjewadi Phase 2', city: 'Pune', state: 'Maharashtra', pincode: '411057', registration_number: 'MH/HSG/2020/7832', total_flats: 200, total_floors: 20, subscription_plan: 'enterprise', maintenance_amount: 4500, maintenance_due_day: 10, is_active: true },
  { name: 'Lake View Heights', address: 'Whitefield Main Road', city: 'Bangalore', state: 'Karnataka', pincode: '560066', registration_number: 'KA/HSG/2021/3341', total_flats: 80, total_floors: 10, subscription_plan: 'professional', maintenance_amount: 3000, maintenance_due_day: 7, is_active: true },
  { name: 'Royal Heritage CHS', address: 'Sector 12, Dwarka', city: 'Delhi', state: 'Delhi', pincode: '110075', registration_number: 'DL/HSG/2021/1122', total_flats: 150, total_floors: 15, subscription_plan: 'enterprise', maintenance_amount: 5000, maintenance_due_day: 5, is_active: true },
  { name: 'Palm Residency', address: 'Banjara Hills Road No. 12', city: 'Hyderabad', state: 'Telangana', pincode: '500034', registration_number: 'TS/HSG/2022/0991', total_flats: 60, total_floors: 8, subscription_plan: 'professional', maintenance_amount: 2800, maintenance_due_day: 5, is_active: true },
  { name: 'Ashoka Apartments', address: 'Anna Nagar West', city: 'Chennai', state: 'Tamil Nadu', pincode: '600040', registration_number: 'TN/HSG/2022/4451', total_flats: 90, total_floors: 11, subscription_plan: 'professional', maintenance_amount: 2500, maintenance_due_day: 5, is_active: true },
  { name: 'Sapphire Heights', address: 'Vaishali Nagar', city: 'Jaipur', state: 'Rajasthan', pincode: '302021', registration_number: 'RJ/HSG/2023/3310', total_flats: 45, total_floors: 6, subscription_plan: 'starter', maintenance_amount: 1500, maintenance_due_day: 5, is_active: true },
  { name: 'Golden Gate CHS', address: 'Kandivali East', city: 'Mumbai', state: 'Maharashtra', pincode: '400101', registration_number: 'MH/HSG/2023/8812', total_flats: 110, total_floors: 14, subscription_plan: 'professional', maintenance_amount: 3200, maintenance_due_day: 5, is_active: true },
  { name: 'Crystal Towers', address: 'SG Highway', city: 'Ahmedabad', state: 'Gujarat', pincode: '380054', registration_number: 'GJ/HSG/2023/5591', total_flats: 75, total_floors: 9, subscription_plan: 'starter', maintenance_amount: 2000, maintenance_due_day: 5, is_active: false },
  { name: 'Heritage Palms', address: 'New Town, Action Area 2', city: 'Kolkata', state: 'West Bengal', pincode: '700156', registration_number: 'WB/HSG/2022/7712', total_flats: 130, total_floors: 16, subscription_plan: 'enterprise', maintenance_amount: 4000, maintenance_due_day: 5, is_active: false },
]

// ─── USERS ────────────────────────────────────────────────────
const USERS_DATA = [
  // Society Admins
  { email: 'admin@greenvalley.com',   phone: '+919800100001', full_name: 'Ramesh Patil',    role: 'society_admin', is_active: true },
  { email: 'admin@sunshine.com',      phone: '+919800100002', full_name: 'Suneeta Joshi',   role: 'society_admin', is_active: true },
  { email: 'admin@lakeview.com',      phone: '+919800100003', full_name: 'Kiran Kumar',     role: 'society_admin', is_active: true },
  { email: 'admin@royalheritage.com', phone: '+919800100004', full_name: 'Vandana Singh',   role: 'society_admin', is_active: true },
  { email: 'admin@palmresidency.com', phone: '+919800100005', full_name: 'Srinivas Rao',    role: 'society_admin', is_active: true },
  // Board members
  { email: 'suresh@greenvalley.com',  phone: '+919800200001', full_name: 'Suresh Kumar',    role: 'board_member',  is_active: true },
  { email: 'anita@sunshine.com',      phone: '+919800200002', full_name: 'Anita Mehta',     role: 'board_member',  is_active: true },
  // Landlords
  { email: 'vikram@gmail.com',        phone: '+919800300001', full_name: 'Vikram Malhotra', role: 'landlord',      is_active: true },
  { email: 'priyanka@gmail.com',      phone: '+919800300002', full_name: 'Priyanka Desai',  role: 'landlord',      is_active: true },
  { email: 'rohit@gmail.com',         phone: '+919800300003', full_name: 'Rohit Kapoor',    role: 'landlord',      is_active: true },
  { email: 'meena@gmail.com',         phone: '+919800300004', full_name: 'Meena Sharma',    role: 'landlord',      is_active: true },
  { email: 'arun@gmail.com',          phone: '+919800300005', full_name: 'Arun Joshi',      role: 'landlord',      is_active: true },
  // Tenants
  { email: 'rajesh@gmail.com',        phone: '+919800400001', full_name: 'Rajesh Sharma',   role: 'tenant',        is_active: true },
  { email: 'kavita@gmail.com',        phone: '+919800400002', full_name: 'Kavita Singh',    role: 'tenant',        is_active: true },
  { email: 'mali@gmail.com',          phone: '+919800400003', full_name: 'Mohammed Ali',    role: 'tenant',        is_active: true },
  { email: 'deepa@gmail.com',         phone: '+919800400004', full_name: 'Deepa Nair',      role: 'tenant',        is_active: true },
  { email: 'sanjay@gmail.com',        phone: '+919800400005', full_name: 'Sanjay Gupta',    role: 'tenant',        is_active: true },
]

async function seed() {
  console.log('\n🌱 Seeding MyRentSaathi database...\n')

  // ── Societies ──
  const societies = await run(
    'societies',
    sb.from('societies').insert(SOCIETIES_DATA).select()
  )
  if (!societies) return

  const gv  = societies.find(s => s.name === 'Green Valley CHS')
  const sun = societies.find(s => s.name === 'Sunshine Towers')
  const lv  = societies.find(s => s.name === 'Lake View Heights')
  const rh  = societies.find(s => s.name === 'Royal Heritage CHS')

  // ── Users ──
  const users = await run(
    'users',
    sb.from('users').insert(USERS_DATA).select()
  )
  if (!users) return

  const vikram   = users.find(u => u.email === 'vikram@gmail.com')
  const priyanka = users.find(u => u.email === 'priyanka@gmail.com')
  const rohit    = users.find(u => u.email === 'rohit@gmail.com')
  const rajesh   = users.find(u => u.email === 'rajesh@gmail.com')
  const kavita   = users.find(u => u.email === 'kavita@gmail.com')
  const mali     = users.find(u => u.email === 'mali@gmail.com')
  const gvAdmin  = users.find(u => u.email === 'admin@greenvalley.com')
  const sunAdmin = users.find(u => u.email === 'admin@sunshine.com')

  // ── Flats ──
  const FLATS_DATA = [
    { society_id: gv.id, flat_number: 'A-101', floor_number: 1, block: 'A', flat_type: '2BHK', area_sqft: 950, owner_id: vikram.id, current_tenant_id: rajesh.id, monthly_rent: 28000, security_deposit: 56000, status: 'occupied' },
    { society_id: gv.id, flat_number: 'A-102', floor_number: 1, block: 'A', flat_type: '2BHK', area_sqft: 950, owner_id: vikram.id, current_tenant_id: kavita.id, monthly_rent: 27000, security_deposit: 54000, status: 'occupied' },
    { society_id: gv.id, flat_number: 'B-201', floor_number: 2, block: 'B', flat_type: '3BHK', area_sqft: 1300, owner_id: priyanka.id, current_tenant_id: null, monthly_rent: 45000, security_deposit: 90000, status: 'vacant' },
    { society_id: gv.id, flat_number: 'B-301', floor_number: 3, block: 'B', flat_type: '2BHK', area_sqft: 900, owner_id: priyanka.id, current_tenant_id: null, monthly_rent: 26000, security_deposit: 52000, status: 'vacant' },
    { society_id: sun.id, flat_number: 'C-101', floor_number: 1, block: 'C', flat_type: '2BHK', area_sqft: 1050, owner_id: rohit.id, current_tenant_id: mali.id, monthly_rent: 22000, security_deposit: 44000, status: 'occupied' },
    { society_id: sun.id, flat_number: 'C-201', floor_number: 2, block: 'C', flat_type: '1BHK', area_sqft: 650, owner_id: rohit.id, current_tenant_id: null, monthly_rent: 14000, security_deposit: 28000, status: 'vacant' },
    { society_id: lv.id, flat_number: 'D-101', floor_number: 1, block: 'D', flat_type: '2BHK', area_sqft: 1000, owner_id: vikram.id, current_tenant_id: null, monthly_rent: 25000, security_deposit: 50000, status: 'vacant' },
  ]
  const flats = await run('flats', sb.from('flats').insert(FLATS_DATA).select())
  if (!flats) return

  const flatA101 = flats.find(f => f.flat_number === 'A-101')
  const flatA102 = flats.find(f => f.flat_number === 'A-102')
  const flatC101 = flats.find(f => f.flat_number === 'C-101')

  // ── Society Members ──
  const MEMBERS = [
    { society_id: gv.id,  user_id: gvAdmin.id, role: 'admin' },
    { society_id: gv.id,  user_id: vikram.id,   role: 'landlord' },
    { society_id: gv.id,  user_id: priyanka.id, role: 'landlord' },
    { society_id: gv.id,  user_id: rajesh.id,   role: 'tenant' },
    { society_id: gv.id,  user_id: kavita.id,   role: 'tenant' },
    { society_id: sun.id, user_id: sunAdmin.id, role: 'admin' },
    { society_id: sun.id, user_id: rohit.id,    role: 'landlord' },
    { society_id: sun.id, user_id: mali.id,     role: 'tenant' },
  ]
  await run('society_members', sb.from('society_members').insert(MEMBERS).select())

  // ── Tenants ──
  const TENANTS = [
    { user_id: rajesh.id, flat_id: flatA101.id, society_id: gv.id, landlord_id: vikram.id,   lease_start: '2025-10-01', lease_end: '2026-09-30', monthly_rent: 28000, security_deposit: 56000, status: 'active' },
    { user_id: kavita.id, flat_id: flatA102.id, society_id: gv.id, landlord_id: vikram.id,   lease_start: '2025-11-01', lease_end: '2026-10-31', monthly_rent: 27000, security_deposit: 54000, status: 'active' },
    { user_id: mali.id,   flat_id: flatC101.id, society_id: sun.id, landlord_id: rohit.id,   lease_start: '2025-12-01', lease_end: '2026-11-30', monthly_rent: 22000, security_deposit: 44000, status: 'active' },
  ]
  const tenants = await run('tenants', sb.from('tenants').insert(TENANTS).select())
  if (!tenants) return

  const tenantRajesh = tenants.find(t => t.user_id === rajesh.id)
  const tenantKavita = tenants.find(t => t.user_id === kavita.id)
  const tenantMali   = tenants.find(t => t.user_id === mali.id)

  // ── Rent Payments ──
  const RENT_PAYMENTS = [
    // Rajesh - A101
    { tenant_id: tenantRajesh.id, flat_id: flatA101.id, landlord_id: vikram.id, society_id: gv.id, amount: 28000, expected_amount: 28000, month_year: '2026-01', due_date: '2026-01-05', payment_date: '2026-01-03', status: 'paid', payment_method: 'upi' },
    { tenant_id: tenantRajesh.id, flat_id: flatA101.id, landlord_id: vikram.id, society_id: gv.id, amount: 28000, expected_amount: 28000, month_year: '2026-02', due_date: '2026-02-05', payment_date: '2026-02-04', status: 'paid', payment_method: 'upi' },
    { tenant_id: tenantRajesh.id, flat_id: flatA101.id, landlord_id: vikram.id, society_id: gv.id, amount: 0,     expected_amount: 28000, month_year: '2026-03', due_date: '2026-03-05', payment_date: null, status: 'pending', payment_method: null },
    // Kavita - A102
    { tenant_id: tenantKavita.id, flat_id: flatA102.id, landlord_id: vikram.id, society_id: gv.id, amount: 27000, expected_amount: 27000, month_year: '2026-02', due_date: '2026-02-05', payment_date: '2026-02-06', status: 'paid', payment_method: 'bank_transfer' },
    { tenant_id: tenantKavita.id, flat_id: flatA102.id, landlord_id: vikram.id, society_id: gv.id, amount: 0,     expected_amount: 27000, month_year: '2026-03', due_date: '2026-03-05', payment_date: null, status: 'overdue', payment_method: null },
    // Mali - C101
    { tenant_id: tenantMali.id, flat_id: flatC101.id, landlord_id: rohit.id, society_id: sun.id, amount: 22000, expected_amount: 22000, month_year: '2026-02', due_date: '2026-02-10', payment_date: '2026-02-09', status: 'paid', payment_method: 'upi' },
    { tenant_id: tenantMali.id, flat_id: flatC101.id, landlord_id: rohit.id, society_id: sun.id, amount: 0,     expected_amount: 22000, month_year: '2026-03', due_date: '2026-03-10', payment_date: null, status: 'pending', payment_method: null },
  ]
  await run('rent_payments', sb.from('rent_payments').insert(RENT_PAYMENTS).select())

  // ── Maintenance Payments ──
  const flatB201 = flats.find(f => f.flat_number === 'B-201')
  const MAINT_PAYMENTS = [
    { society_id: gv.id,  flat_id: flatA101.id,       payer_id: rajesh.id,   amount: 3500, expected_amount: 3500, period: '2026-03', due_date: '2026-03-05', payment_date: '2026-03-03', status: 'paid',    payment_method: 'upi' },
    { society_id: gv.id,  flat_id: flatA102.id,       payer_id: kavita.id,   amount: 0,    expected_amount: 3500, period: '2026-03', due_date: '2026-03-05', payment_date: null,          status: 'pending' },
    { society_id: gv.id,  flat_id: flatB201?.id,      payer_id: priyanka.id, amount: 0,    expected_amount: 3500, period: '2026-03', due_date: '2026-03-05', payment_date: null,          status: 'overdue' },
    { society_id: sun.id, flat_id: flatC101.id,       payer_id: mali.id,     amount: 4500, expected_amount: 4500, period: '2026-03', due_date: '2026-03-10', payment_date: '2026-03-08', status: 'paid',    payment_method: 'upi' },
  ]
  await run('maintenance_payments', sb.from('maintenance_payments').insert(MAINT_PAYMENTS).select())

  // ── Tickets ──
  const TICKETS = [
    { society_id: gv.id,  flat_id: flatA101.id, raised_by: rajesh.id,   category: 'lift',     subject: 'Lift B stuck on 2nd floor', description: 'Lift B has been stuck since morning, residents using stairs.', priority: 'urgent', status: 'open' },
    { society_id: gv.id,  flat_id: flatA102.id, raised_by: kavita.id,   category: 'plumbing', subject: 'Water leakage in kitchen', description: 'Pipe under kitchen sink is leaking.', priority: 'high', status: 'in_progress' },
    { society_id: gv.id,  flat_id: flatA101.id, raised_by: rajesh.id,   category: 'security', subject: 'Main gate CCTV not working', description: 'CCTV camera at main gate has been off since 3 days.', priority: 'high', status: 'assigned' },
    { society_id: sun.id, flat_id: flatC101.id, raised_by: mali.id,     category: 'cleaning', subject: 'Common area not cleaned', description: 'Lobby area on floor 3 not cleaned for 2 days.', priority: 'medium', status: 'open' },
    { society_id: lv.id,  flat_id: null,        raised_by: gvAdmin.id,  category: 'electrical', subject: 'Street lights not working', description: 'Garden area lights not working at night.', priority: 'medium', status: 'resolved' },
  ]
  await run('tickets', sb.from('tickets').insert(TICKETS).select())

  // ── Notices ──
  const NOTICES = [
    { society_id: gv.id,  title: 'Annual General Meeting', content: 'AGM scheduled for 5th April 2026 at 6 PM in the community hall. All landlords and board members must attend.', notice_type: 'event', target_audience: 'all', created_by: gvAdmin.id, send_whatsapp: true },
    { society_id: gv.id,  title: 'March Maintenance Due', content: 'March 2026 maintenance of ₹3,500 is due by 5th March. Please pay via UPI or online portal.', notice_type: 'financial', target_audience: 'all', created_by: gvAdmin.id, send_whatsapp: true },
    { society_id: sun.id, title: 'Water Supply Interruption', content: 'Water supply will be interrupted on 25 March from 10 AM to 2 PM for tank cleaning.', notice_type: 'maintenance', target_audience: 'all', created_by: sunAdmin.id, send_whatsapp: true },
  ]
  await run('notices', sb.from('notices').insert(NOTICES).select())

  // ── WhatsApp Logs ──
  const WA_LOGS = [
    { society_id: gv.id,  sender_phone: '+918048887890', recipient_phone: '+919800400001', template_name: 'rent_reminder',        message_type: 'rent_reminder',        status: 'delivered', direction: 'outbound', cost: 0.50 },
    { society_id: gv.id,  sender_phone: '+918048887890', recipient_phone: '+919800400002', template_name: 'maintenance_reminder', message_type: 'maintenance_reminder', status: 'read',      direction: 'outbound', cost: 0.50 },
    { society_id: gv.id,  sender_phone: '+918048887890', recipient_phone: '+919800400001', template_name: 'payment_receipt',      message_type: 'payment_receipt',      status: 'read',      direction: 'outbound', cost: 0.50 },
    { society_id: sun.id, sender_phone: '+918048887890', recipient_phone: '+919800400003', template_name: 'rent_reminder',        message_type: 'rent_reminder',        status: 'delivered', direction: 'outbound', cost: 0.50 },
    { society_id: gv.id,  sender_phone: '+918048887890', recipient_phone: '+919800300001', template_name: 'society_notice',       message_type: 'society_notices',      status: 'failed',    direction: 'outbound', cost: 0.00 },
    { society_id: gv.id,  sender_phone: '+918048887890', recipient_phone: '+919800400002', template_name: 'ticket_update',        message_type: 'ticket_updates',       status: 'delivered', direction: 'outbound', cost: 0.50 },
  ]
  await run('whatsapp_logs', sb.from('whatsapp_logs').insert(WA_LOGS).select())

  // ── Agreements ──
  if (flatA101 && tenants.length > 0) {
    const AGREEMENTS = [
      { flat_id: flatA101.id, landlord_id: vikram.id, tenant_id: tenantRajesh.id, society_id: gv.id, city: 'Mumbai', agreement_type: 'leave_license', start_date: '2025-10-01', end_date: '2026-09-30', monthly_rent: 28000, security_deposit: 56000, tier: 'lawyer_verified', status: 'active' },
      { flat_id: flatA102.id, landlord_id: vikram.id, tenant_id: tenantKavita.id, society_id: gv.id, city: 'Mumbai', agreement_type: 'leave_license', start_date: '2025-11-01', end_date: '2026-10-31', monthly_rent: 27000, security_deposit: 54000, tier: 'free', status: 'active' },
      { flat_id: flatC101.id, landlord_id: rohit.id,  tenant_id: tenantMali.id,   society_id: sun.id, city: 'Pune', agreement_type: 'rent_agreement', start_date: '2025-12-01', end_date: '2026-11-30', monthly_rent: 22000, security_deposit: 44000, tier: 'registered', status: 'active' },
    ]
    await run('agreements', sb.from('agreements').insert(AGREEMENTS).select())
  }

  console.log('\n🎉 Database seeded successfully!\n')
}

seed().catch(e => {
  console.error('Seed failed:', e.message)
  process.exit(1)
})

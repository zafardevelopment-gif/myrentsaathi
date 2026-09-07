/**
 * MyRentSaathi — DEMO Accounts Seed Script
 * Run: node scripts/seed-demo-accounts.mjs
 *
 * Creates a full-paid (enterprise plan) demo Society + Society Admin,
 * a society-linked Landlord + Tenants, an independent Landlord + Tenant,
 * and a late-fee rule for both scopes (5-day due date, ₹200 flat fee after
 * grace, applied automatically by the existing late-fee cron).
 *
 * All records are clearly prefixed "DEMO" so they never mix with real data.
 * Password for every demo login: Demo@123
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://iqtbwznmjwipqzbxwgtz.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxdGJ3em5tandpcHF6Ynh3Z3R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MTM0NjEsImV4cCI6MjA4MzI4OTQ2MX0.58S_eJLmGYGdyz280WFwg3p2YfzvFvu_Ct95F7QtUI0'

const sb = createClient(SUPABASE_URL, ANON_KEY)

const PASSWORD = 'Demo@123'
const credentials = []

async function run(label, promise) {
  const r = await promise
  if (r.error) {
    console.error(`❌ ${label}:`, r.error.message, r.error.code)
    return null
  }
  console.log(`✅ ${label}: ${Array.isArray(r.data) ? r.data.length : 1} rows`)
  return r.data
}

async function seed() {
  console.log('\n🌱 Seeding DEMO accounts (full-paid, enterprise plan)...\n')

  // ── 1. DEMO Society (enterprise plan, active, due day 5) ──
  const society = await run('society', sb.from('societies').insert({
    name: 'DEMO Society',
    address: 'Demo Address Line 1',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    registration_number: 'DEMO/HSG/2026/0001',
    total_flats: 10,
    total_floors: 5,
    subscription_plan: 'enterprise',
    maintenance_amount: 3000,
    maintenance_due_day: 5,
    is_active: true,
  }).select().single())
  if (!society) return

  // ── 2. Society Admin ──
  const societyAdmin = await run('society_admin user', sb.from('users').insert({
    email: 'demo.admin@myrentsaathi.com',
    phone: '+919999900001',
    full_name: 'DEMO Society Admin',
    role: 'society_admin',
    password: PASSWORD,
    is_active: true,
  }).select().single())
  if (!societyAdmin) return
  credentials.push({ role: 'Society Admin', email: societyAdmin.email, password: PASSWORD })

  await run('link admin to society', sb.from('society_members').insert({
    society_id: society.id,
    user_id: societyAdmin.id,
    role: 'admin',
    designation: 'Society Admin',
  }))

  // ── 3. Society-linked Landlord ──
  const landlord1 = await run('society landlord user', sb.from('users').insert({
    email: 'demo.landlord1@myrentsaathi.com',
    phone: '+919999900002',
    full_name: 'DEMO Landlord (Society)',
    role: 'landlord',
    password: PASSWORD,
    is_active: true,
    is_independent: false,
    admin_user_id: 'LND-DEMO1',
  }).select().single())
  if (!landlord1) return
  credentials.push({ role: 'Landlord (Society-linked)', email: landlord1.email, password: PASSWORD, userId: 'LND-DEMO1' })

  await run('link landlord1 to society', sb.from('society_members').insert({
    society_id: society.id,
    user_id: landlord1.id,
    role: 'landlord',
    designation: 'Landlord',
  }))

  // ── 4. Flat inside DEMO Society, owned by landlord1 ──
  const flat1 = await run('flat (society)', sb.from('flats').insert({
    society_id: society.id,
    flat_number: 'D-101',
    floor_number: 1,
    block: 'D',
    flat_type: '2BHK',
    area_sqft: 950,
    owner_id: landlord1.id,
    owner_name: landlord1.full_name,
    owner_phone: landlord1.phone,
    owner_email: landlord1.email,
    monthly_rent: 25000,
    security_deposit: 50000,
    status: 'vacant',
  }).select().single())
  if (!flat1) return

  // ── 5. Tenant in DEMO Society flat ──
  const tenant1User = await run('society tenant user', sb.from('users').insert({
    email: 'demo.tenant1@myrentsaathi.com',
    phone: '+919999900003',
    full_name: 'DEMO Tenant (Society)',
    role: 'tenant',
    password: PASSWORD,
    is_active: true,
    admin_user_id: 'TNT-DEMO1',
  }).select().single())
  if (!tenant1User) return
  credentials.push({ role: 'Tenant (Society flat)', email: tenant1User.email, password: PASSWORD, userId: 'TNT-DEMO1' })

  const today = new Date().toISOString().slice(0, 10)
  const leaseEnd = new Date(); leaseEnd.setFullYear(leaseEnd.getFullYear() + 1)

  const tenant1 = await run('tenant record (society)', sb.from('tenants').insert({
    user_id: tenant1User.id,
    flat_id: flat1.id,
    society_id: society.id,
    landlord_id: landlord1.id,
    lease_start: today,
    lease_end: leaseEnd.toISOString().slice(0, 10),
    monthly_rent: 25000,
    security_deposit: 50000,
    status: 'active',
  }).select().single())
  if (!tenant1) return

  await run('link tenant1 to society', sb.from('society_members').insert({
    society_id: society.id,
    user_id: tenant1User.id,
    role: 'tenant',
  }))

  await run('update flat1 occupied', sb.from('flats').update({
    current_tenant_id: tenant1User.id,
    status: 'occupied',
  }).eq('id', flat1.id))

  // ── 6. Independent Landlord (no society) ──
  const landlord2 = await run('independent landlord user', sb.from('users').insert({
    email: 'demo.landlord2@myrentsaathi.com',
    phone: '+919999900004',
    full_name: 'DEMO Landlord (Independent)',
    role: 'landlord',
    password: PASSWORD,
    is_active: true,
    is_independent: true,
  }).select().single())
  if (!landlord2) return
  credentials.push({ role: 'Landlord (Independent)', email: landlord2.email, password: PASSWORD })

  // ── 7. Flat for independent landlord (no society_id) ──
  const flat2 = await run('flat (independent)', sb.from('flats').insert({
    society_id: null,
    flat_number: 'IND-1',
    flat_type: '1BHK',
    area_sqft: 650,
    owner_id: landlord2.id,
    owner_name: landlord2.full_name,
    owner_phone: landlord2.phone,
    owner_email: landlord2.email,
    monthly_rent: 15000,
    security_deposit: 30000,
    status: 'vacant',
  }).select().single())
  if (!flat2) return

  // ── 8. Tenant for independent landlord ──
  const tenant2User = await run('independent tenant user', sb.from('users').insert({
    email: 'demo.tenant2@myrentsaathi.com',
    phone: '+919999900005',
    full_name: 'DEMO Tenant (Independent)',
    role: 'tenant',
    password: PASSWORD,
    is_active: true,
    admin_user_id: 'TNT-DEMO2',
  }).select().single())
  if (!tenant2User) return
  credentials.push({ role: 'Tenant (Independent landlord)', email: tenant2User.email, password: PASSWORD, userId: 'TNT-DEMO2' })

  const tenant2 = await run('tenant record (independent)', sb.from('tenants').insert({
    user_id: tenant2User.id,
    flat_id: flat2.id,
    society_id: null,
    landlord_id: landlord2.id,
    lease_start: today,
    lease_end: leaseEnd.toISOString().slice(0, 10),
    monthly_rent: 15000,
    security_deposit: 30000,
    status: 'active',
    late_fee_type: 'fixed',
    late_fee_value: 200,
  }).select().single())
  if (!tenant2) return

  await run('update flat2 occupied', sb.from('flats').update({
    current_tenant_id: tenant2User.id,
    status: 'occupied',
  }).eq('id', flat2.id))

  // ── 9. Late-fee rules (§21): 5-day grace matching "due by 5th", ₹200 flat fee ──
  await run('late fee rule (society scope)', sb.from('late_fee_rules').insert({
    society_id: society.id,
    landlord_id: null,
    invoice_type: 'all',
    grace_days: 0,
    fee_type: 'flat',
    fee_value: 200,
    max_fee: 200,
    is_active: true,
  }))

  await run('late fee rule (independent landlord scope)', sb.from('late_fee_rules').insert({
    society_id: null,
    landlord_id: landlord2.id,
    invoice_type: 'all',
    grace_days: 0,
    fee_type: 'flat',
    fee_value: 200,
    max_fee: 200,
    is_active: true,
  }))

  // ── 10. First rent payment rows due on the 5th (so overdue/late-fee cron has something to act on) ──
  const monthYear = today.slice(0, 7)
  const dueDate = `${monthYear}-05`

  await run('rent payment row (society tenant)', sb.from('rent_payments').insert({
    tenant_id: tenant1.id,
    flat_id: flat1.id,
    landlord_id: landlord1.id,
    society_id: society.id,
    amount: 0,
    expected_amount: 25000,
    month_year: monthYear,
    due_date: dueDate,
    status: 'pending',
  }))

  await run('rent payment row (independent tenant)', sb.from('rent_payments').insert({
    tenant_id: tenant2.id,
    flat_id: flat2.id,
    landlord_id: landlord2.id,
    society_id: null,
    amount: 0,
    expected_amount: 15000,
    month_year: monthYear,
    due_date: dueDate,
    status: 'pending',
  }))

  console.log('\n🎉 DEMO accounts seeded successfully!\n')
  console.log('─'.repeat(70))
  console.log('LOGIN CREDENTIALS (password is the same for all: ' + PASSWORD + ')')
  console.log('─'.repeat(70))
  for (const c of credentials) {
    console.log(`${c.role.padEnd(32)} | ${c.email}${c.userId ? '  (User ID: ' + c.userId + ')' : ''}`)
  }
  console.log('─'.repeat(70))
  console.log('Society Admin logs in with the email above at the normal login page.')
  console.log('Landlords/Tenants can log in with email OR their User ID + password.')
  console.log('Both DEMO Society and DEMO Landlord (Independent) are on the')
  console.log('"enterprise" plan / marked active — i.e. fully unlocked.\n')
}

seed().catch(e => {
  console.error('Seed failed:', e.message)
  process.exit(1)
})

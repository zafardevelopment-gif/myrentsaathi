/**
 * MyRentSaathi — Activate paid subscriptions for the DEMO accounts.
 * Run: node scripts/seed-demo-subscriptions.mjs
 *
 * DashboardShell (components/dashboard/DashboardShell.tsx) gates admin/landlord
 * access via the `subscriptions` table (lib/subscription.ts), NOT
 * societies.subscription_plan. Without a row here, society_admin/landlord
 * demo accounts get redirected to /select-plan even if the society itself is
 * marked "enterprise". This creates an "active" subscription (10-year expiry)
 * for demo.admin and demo.landlord1/2 so the dashboard unlocks fully.
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

async function activate(email, planType, societyId) {
  const { data: user } = await sb.from('users').select('id, full_name').eq('email', email).maybeSingle()
  if (!user) { console.error(`❌ user not found: ${email}`); return }

  const now = new Date()
  const expires = new Date(now)
  expires.setFullYear(expires.getFullYear() + 10) // effectively unlimited for demo

  await run(`subscription for ${email}`, sb.from('subscriptions').insert({
    user_id: user.id,
    society_id: societyId ?? null,
    plan_type: planType,
    plan_name: planType === 'society' ? 'Professional (Demo)' : 'Landlord Pro (Demo)',
    plan_price: 0,
    status: 'active',
    trial_days: 0,
    starts_at: now.toISOString(),
    expires_at: expires.toISOString(),
    activated_at: now.toISOString(),
  }))
}

async function seed() {
  console.log('\n🌱 Activating DEMO subscriptions...\n')

  const { data: society } = await sb.from('societies').select('id').eq('name', 'DEMO Society').maybeSingle()
  if (!society) { console.error('❌ DEMO Society not found — run seed-demo-accounts.mjs first.'); return }

  await activate('demo.admin@myrentsaathi.com', 'society', society.id)
  await activate('demo.landlord1@myrentsaathi.com', 'landlord', null)
  await activate('demo.landlord2@myrentsaathi.com', 'landlord', null)

  console.log('\n🎉 Demo subscriptions activated — dashboards should now unlock fully.\n')
}

seed().catch(e => {
  console.error('Seed failed:', e.message)
  process.exit(1)
})

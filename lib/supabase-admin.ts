import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Service role client — bypasses RLS. Used ONLY in server actions / superadmin writes.
// Never expose SUPABASE_SERVICE_ROLE_KEY to the browser bundle.
// Lazy singleton to prevent "supabaseKey is required" at module evaluation time.
let _adminClient: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (_adminClient) return _adminClient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  _adminClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return _adminClient
}

// Named export kept for backwards compatibility.
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseAdmin() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Lazy singleton — created on first property access, not at module load.
// Prevents crashes during Turbopack SSR chunk evaluation.
let _client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      '[MyRentSaathi] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Add both to your .env.local file and restart the dev server.'
    )
  }

  _client = createClient(url, key)
  return _client
}

// Proxy-based named export — backwards compatible with all existing imports.
// The real client is only resolved on first method call.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseClient() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

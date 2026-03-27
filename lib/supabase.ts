import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Lazy singleton — client is created on first call, not at module load time.
// This prevents "supabaseKey is required" crashes when the module is evaluated
// before environment variables are injected (e.g. in Turbopack SSR chunks).
let _client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  _client = createClient(url, key)
  return _client
}

// Named export kept for backwards compatibility with existing code that does
// `import { supabase } from "@/lib/supabase"`.
// It is a Proxy so the actual client is only resolved on first property access.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseClient() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

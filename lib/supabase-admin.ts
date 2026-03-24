import { createClient } from '@supabase/supabase-js'

// Service role client — bypasses RLS. Used ONLY in server actions / superadmin writes.
// Never expose SUPABASE_SERVICE_ROLE_KEY to the browser bundle.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

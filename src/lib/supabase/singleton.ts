import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

// Singleton instances
let browserClient: SupabaseClient | null = null
let serverClient: SupabaseClient | null = null

/**
 * Get singleton Supabase client for browser/component use
 * This prevents multiple client instantiations and connection pool exhaustion
 */
export function getSupabaseClient() {
  if (!browserClient) {
    browserClient = createClientComponentClient()
  }
  return browserClient
}

/**
 * Get singleton Supabase client for server-side use
 */
export function getServerSupabaseClient() {
  if (!serverClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    serverClient = createClient(supabaseUrl, supabaseKey)
  }
  return serverClient
}

/**
 * Clear cached clients (useful for testing or logout)
 */
export function clearSupabaseClients() {
  browserClient = null
  serverClient = null
}
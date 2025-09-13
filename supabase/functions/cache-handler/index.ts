import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CacheRequest {
  action: 'get' | 'set' | 'invalidate' | 'warmup'
  key: string
  value?: any
  ttl?: number
  pattern?: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { action, key, value, ttl = 3600, pattern } = await req.json() as CacheRequest
    
    // Get tenant context from auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    
    if (!user) {
      throw new Error('Invalid user')
    }

    // Get user's tenant
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    if (!userTenant) {
      throw new Error('No tenant found')
    }

    const tenantId = userTenant.tenant_id

    switch (action) {
      case 'get': {
        // Try to get from cache
        const { data: cacheEntry } = await supabase
          .from('cache_entries')
          .select('cache_value, expires_at')
          .eq('tenant_id', tenantId)
          .eq('cache_key', key)
          .single()

        if (cacheEntry && new Date(cacheEntry.expires_at) > new Date()) {
          // Update access count
          await supabase
            .from('cache_entries')
            .update({ 
              access_count: supabase.rpc('increment', { x: 1 }),
              last_accessed_at: new Date().toISOString()
            })
            .eq('tenant_id', tenantId)
            .eq('cache_key', key)

          return new Response(
            JSON.stringify({ hit: true, value: cacheEntry.cache_value }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ hit: false, value: null }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'set': {
        // Store in cache
        const { error } = await supabase
          .from('cache_entries')
          .upsert({
            tenant_id: tenantId,
            cache_key: key,
            cache_value: value,
            cache_type: 'query',
            ttl_seconds: ttl,
            expires_at: new Date(Date.now() + ttl * 1000).toISOString()
          })

        if (error) throw error

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'invalidate': {
        // Invalidate cache entries matching pattern
        if (pattern) {
          const { error } = await supabase
            .from('cache_entries')
            .delete()
            .eq('tenant_id', tenantId)
            .like('cache_key', pattern)
        } else {
          const { error } = await supabase
            .from('cache_entries')
            .delete()
            .eq('tenant_id', tenantId)
            .eq('cache_key', key)
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'warmup': {
        // Pre-populate cache with common queries
        const warmupQueries = [
          { key: 'projects:list', query: 'select * from projects' },
          { key: 'tasks:recent', query: 'select * from tasks order by created_at desc limit 10' },
          { key: 'team:members', query: 'select * from profiles' }
        ]

        for (const wq of warmupQueries) {
          const { data } = await supabase.rpc('execute_query', { query_text: wq.query })
          
          await supabase
            .from('cache_entries')
            .upsert({
              tenant_id: tenantId,
              cache_key: wq.key,
              cache_value: data,
              cache_type: 'query',
              ttl_seconds: 7200,
              expires_at: new Date(Date.now() + 7200 * 1000).toISOString()
            })
        }

        return new Response(
          JSON.stringify({ success: true, warmed: warmupQueries.length }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        throw new Error(`Unknown action: ${action}`)
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
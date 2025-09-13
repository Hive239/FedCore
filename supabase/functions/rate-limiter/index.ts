import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Rate Limiter Edge Function
 * Enforces tenant-specific rate limits for 50,000 users
 * Prevents API abuse and ensures fair resource usage
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id',
}

// Rate limit configurations by subscription tier
const RATE_LIMITS = {
  free: {
    requests_per_minute: 60,
    requests_per_hour: 1000,
    requests_per_day: 10000,
  },
  pro: {
    requests_per_minute: 300,
    requests_per_hour: 10000,
    requests_per_day: 100000,
  },
  enterprise: {
    requests_per_minute: 1000,
    requests_per_hour: 50000,
    requests_per_day: 1000000,
  },
}

// In-memory cache for rate limiting (would use Redis in production)
const rateLimitCache = new Map<string, { count: number; resetAt: Date }>()

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get tenant ID from header or auth token
    const authHeader = req.headers.get('authorization')
    const tenantId = req.headers.get('x-tenant-id')
    
    if (!authHeader && !tenantId) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let userId: string | null = null
    let resolvedTenantId: string = tenantId || ''

    // If auth token provided, validate and get user/tenant info
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error } = await supabase.auth.getUser(token)
      
      if (error || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid authentication token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      userId = user.id

      // Get user's tenant if not provided
      if (!resolvedTenantId) {
        const { data: userTenant } = await supabase
          .from('user_tenants')
          .select('tenant_id')
          .eq('user_id', userId)
          .single()
        
        resolvedTenantId = userTenant?.tenant_id || ''
      }
    }

    // Get tenant subscription tier
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('subscription_tier, max_api_calls_per_month')
      .eq('id', resolvedTenantId)
      .single()

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ error: 'Invalid tenant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const tier = tenant.subscription_tier || 'free'
    const limits = RATE_LIMITS[tier as keyof typeof RATE_LIMITS] || RATE_LIMITS.free

    // Check rate limits
    const now = new Date()
    const minuteKey = `${resolvedTenantId}:minute:${Math.floor(now.getTime() / 60000)}`
    const hourKey = `${resolvedTenantId}:hour:${Math.floor(now.getTime() / 3600000)}`
    const dayKey = `${resolvedTenantId}:day:${Math.floor(now.getTime() / 86400000)}`

    // Check and update minute limit
    const minuteLimit = rateLimitCache.get(minuteKey) || { count: 0, resetAt: new Date(now.getTime() + 60000) }
    if (minuteLimit.count >= limits.requests_per_minute) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          limit: limits.requests_per_minute,
          period: 'minute',
          resetAt: minuteLimit.resetAt,
          tier: tier
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': String(limits.requests_per_minute),
            'X-RateLimit-Remaining': String(Math.max(0, limits.requests_per_minute - minuteLimit.count)),
            'X-RateLimit-Reset': minuteLimit.resetAt.toISOString(),
          } 
        }
      )
    }

    // Update counters
    minuteLimit.count++
    rateLimitCache.set(minuteKey, minuteLimit)

    // Track API usage in database for billing
    await supabase.from('resource_usage').insert({
      tenant_id: resolvedTenantId,
      resource_type: 'api_calls',
      usage_value: 1,
      usage_unit: 'calls',
      period_start: new Date(Math.floor(now.getTime() / 3600000) * 3600000), // Hour boundary
      period_end: new Date(Math.floor(now.getTime() / 3600000) * 3600000 + 3600000),
    }).catch(err => console.error('Failed to track usage:', err))

    // Clean up old cache entries periodically
    if (Math.random() < 0.01) { // 1% chance to cleanup
      const cutoff = now.getTime() - 86400000 // 24 hours ago
      for (const [key, value] of rateLimitCache.entries()) {
        if (value.resetAt.getTime() < cutoff) {
          rateLimitCache.delete(key)
        }
      }
    }

    // Get the actual request path and method
    const url = new URL(req.url)
    const endpoint = `${req.method} ${url.pathname}`

    // Log the API call
    await supabase.from('api_audit_logs').insert({
      tenant_id: resolvedTenantId,
      user_id: userId,
      endpoint: endpoint,
      method: req.method,
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      user_agent: req.headers.get('user-agent'),
      response_status: 200, // Will be updated by actual handler
      created_at: new Date().toISOString(),
    }).catch(err => console.error('Failed to log API call:', err))

    // Return success with rate limit headers
    return new Response(
      JSON.stringify({ 
        allowed: true,
        tenant_id: resolvedTenantId,
        tier: tier,
        limits: limits,
        remaining: {
          minute: Math.max(0, limits.requests_per_minute - minuteLimit.count),
        }
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(limits.requests_per_minute),
          'X-RateLimit-Remaining': String(Math.max(0, limits.requests_per_minute - minuteLimit.count)),
          'X-RateLimit-Reset': minuteLimit.resetAt.toISOString(),
          'X-Tenant-Tier': tier,
        } 
      }
    )
  } catch (error) {
    console.error('Rate limiter error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
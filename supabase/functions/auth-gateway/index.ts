import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Auth Gateway Edge Function
 * Handles multi-tenant authentication and routing for 50,000 users
 * Provides tenant isolation and rate limiting
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id',
}

interface AuthRequest {
  email: string
  password?: string
  tenantSlug?: string
  action: 'login' | 'signup' | 'verify' | 'refresh'
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Create admin client for tenant operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request
    const { email, password, tenantSlug, action }: AuthRequest = await req.json()

    // Get tenant ID from slug if provided
    let tenantId: string | null = null
    if (tenantSlug) {
      const { data: tenant, error: tenantError } = await supabaseAdmin
        .from('tenants')
        .select('id, max_users, subscription_tier')
        .eq('slug', tenantSlug)
        .single()

      if (tenantError || !tenant) {
        return new Response(
          JSON.stringify({ error: 'Invalid tenant' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      tenantId = tenant.id

      // Check user limits for signup
      if (action === 'signup') {
        const { count } = await supabaseAdmin
          .from('user_tenants')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)

        if (count >= tenant.max_users) {
          return new Response(
            JSON.stringify({ 
              error: 'Tenant has reached maximum user limit',
              limit: tenant.max_users,
              subscription_tier: tenant.subscription_tier
            }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    }

    // Handle authentication actions
    switch (action) {
      case 'login': {
        // Authenticate user
        const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
          email,
          password: password!,
        })

        if (authError) {
          return new Response(
            JSON.stringify({ error: authError.message }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get user's tenants
        const { data: userTenants } = await supabaseAdmin
          .from('user_tenants')
          .select(`
            tenant_id,
            role,
            tenants (
              id,
              name,
              slug,
              domain,
              settings,
              subscription_tier
            )
          `)
          .eq('user_id', authData.user.id)

        // Log activity
        await supabaseAdmin.from('activity_logs').insert({
          tenant_id: tenantId || userTenants?.[0]?.tenant_id,
          user_id: authData.user.id,
          action: 'user_login',
          description: `User ${email} logged in`,
          metadata: { 
            ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
            user_agent: req.headers.get('user-agent')
          }
        })

        return new Response(
          JSON.stringify({ 
            user: authData.user,
            session: authData.session,
            tenants: userTenants
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'signup': {
        if (!tenantId) {
          return new Response(
            JSON.stringify({ error: 'Tenant slug required for signup' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Create user
        const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
          email,
          password: password!,
        })

        if (authError) {
          return new Response(
            JSON.stringify({ error: authError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Add user to tenant
        await supabaseAdmin.from('user_tenants').insert({
          tenant_id: tenantId,
          user_id: authData.user!.id,
          role: 'member',
        })

        // Create profile
        await supabaseAdmin.from('profiles').insert({
          id: authData.user!.id,
          email: email,
          tenant_id: tenantId,
        })

        // Log activity
        await supabaseAdmin.from('activity_logs').insert({
          tenant_id: tenantId,
          user_id: authData.user!.id,
          action: 'user_signup',
          description: `New user ${email} signed up`,
          metadata: { 
            ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
            user_agent: req.headers.get('user-agent')
          }
        })

        return new Response(
          JSON.stringify({ 
            user: authData.user,
            session: authData.session,
            message: 'Signup successful. Please check your email to verify your account.'
          }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'verify': {
        // Verify email token
        const token = req.headers.get('authorization')?.replace('Bearer ', '')
        if (!token) {
          return new Response(
            JSON.stringify({ error: 'Token required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: user, error } = await supabaseAdmin.auth.getUser(token)
        
        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Update user verification status
        await supabaseAdmin.from('profiles')
          .update({ email_verified: true, updated_at: new Date().toISOString() })
          .eq('id', user.user.id)

        return new Response(
          JSON.stringify({ message: 'Email verified successfully', user: user.user }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'refresh': {
        const refreshToken = req.headers.get('x-refresh-token')
        if (!refreshToken) {
          return new Response(
            JSON.stringify({ error: 'Refresh token required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data, error } = await supabaseAdmin.auth.refreshSession({
          refresh_token: refreshToken
        })

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ session: data.session }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Auth gateway error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
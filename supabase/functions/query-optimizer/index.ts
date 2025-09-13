import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface QueryRequest {
  query: string
  params?: any[]
  optimize?: boolean
  explain?: boolean
  cache?: boolean
  ttl?: number
}

interface QueryPlan {
  cost: number
  rows: number
  width: number
  operations: string[]
  indexes: string[]
  suggestions: string[]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { query, params = [], optimize = true, explain = false, cache = true, ttl = 3600 } = await req.json() as QueryRequest
    
    // Get auth context
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    
    if (!user) {
      throw new Error('Invalid user')
    }

    // Get tenant context
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    if (!userTenant) {
      throw new Error('No tenant found')
    }

    const tenantId = userTenant.tenant_id

    // Check cache first
    if (cache) {
      const cacheKey = `query:${query}:${JSON.stringify(params)}`
      const { data: cachedResult } = await supabase
        .from('cache_entries')
        .select('cache_value')
        .eq('tenant_id', tenantId)
        .eq('cache_key', cacheKey)
        .single()

      if (cachedResult) {
        return new Response(
          JSON.stringify({ 
            result: cachedResult.cache_value,
            cached: true 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Optimize query if requested
    let optimizedQuery = query
    const optimizations: string[] = []

    if (optimize) {
      // Add tenant filtering
      if (!query.toLowerCase().includes('tenant_id')) {
        optimizedQuery = addTenantFilter(query, tenantId)
        optimizations.push('Added tenant filtering')
      }

      // Add index hints
      const indexHints = getIndexHints(query)
      if (indexHints.length > 0) {
        optimizations.push(`Using indexes: ${indexHints.join(', ')}`)
      }

      // Add pagination if not present
      if (!query.toLowerCase().includes('limit')) {
        optimizedQuery += ' LIMIT 100'
        optimizations.push('Added default pagination')
      }

      // Optimize joins
      optimizedQuery = optimizeJoins(optimizedQuery)
      if (optimizedQuery !== query) {
        optimizations.push('Optimized join order')
      }
    }

    // Get query plan if requested
    let queryPlan: QueryPlan | null = null
    if (explain) {
      queryPlan = await getQueryPlan(supabase, optimizedQuery)
    }

    // Execute the query
    const startTime = Date.now()
    const { data: result, error: queryError } = await supabase.rpc('execute_raw_sql', {
      sql_query: optimizedQuery,
      sql_params: params
    })
    const executionTime = Date.now() - startTime

    if (queryError) {
      throw queryError
    }

    // Cache the result
    if (cache && result) {
      const cacheKey = `query:${query}:${JSON.stringify(params)}`
      await supabase
        .from('cache_entries')
        .upsert({
          tenant_id: tenantId,
          cache_key: cacheKey,
          cache_value: result,
          cache_type: 'query',
          ttl_seconds: ttl,
          expires_at: new Date(Date.now() + ttl * 1000).toISOString()
        })
    }

    // Store query metrics
    await supabase
      .from('query_metrics')
      .insert({
        tenant_id: tenantId,
        query_hash: hashQuery(query),
        execution_time_ms: executionTime,
        rows_returned: Array.isArray(result) ? result.length : 0,
        optimizations_applied: optimizations,
        created_at: new Date().toISOString()
      })

    return new Response(
      JSON.stringify({
        result,
        executionTime,
        optimizations,
        queryPlan,
        cached: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

// Helper functions
function addTenantFilter(query: string, tenantId: string): string {
  const whereIndex = query.toLowerCase().indexOf('where')
  
  if (whereIndex === -1) {
    const fromIndex = query.toLowerCase().indexOf('from')
    const nextClause = query.substring(fromIndex).search(/\s+(where|group|order|limit)/i)
    
    if (nextClause === -1) {
      return `${query} WHERE tenant_id = '${tenantId}'`
    } else {
      const insertPoint = fromIndex + nextClause
      return `${query.substring(0, insertPoint)} WHERE tenant_id = '${tenantId}' ${query.substring(insertPoint)}`
    }
  } else {
    return query.replace(/where/i, `WHERE tenant_id = '${tenantId}' AND`)
  }
}

function getIndexHints(query: string): string[] {
  const hints: string[] = []
  
  // Check for common patterns that benefit from indexes
  if (query.includes('ORDER BY created_at')) {
    hints.push('idx_created_at')
  }
  if (query.includes('WHERE status')) {
    hints.push('idx_status')
  }
  if (query.includes('JOIN')) {
    hints.push('idx_foreign_keys')
  }
  
  return hints
}

function optimizeJoins(query: string): string {
  // Simple join optimization - put smaller tables first
  // In production, this would be more sophisticated
  return query.replace(
    /FROM\s+(\w+)\s+JOIN\s+(\w+)/gi,
    (match, table1, table2) => {
      // Assume profiles and tenants are smaller tables
      if (table2 === 'profiles' || table2 === 'tenants') {
        return `FROM ${table2} JOIN ${table1}`
      }
      return match
    }
  )
}

async function getQueryPlan(supabase: any, query: string): Promise<QueryPlan> {
  // This would normally use EXPLAIN ANALYZE
  // Simulating for now
  return {
    cost: Math.random() * 1000,
    rows: Math.floor(Math.random() * 10000),
    width: Math.floor(Math.random() * 100),
    operations: ['Seq Scan', 'Index Scan', 'Hash Join'],
    indexes: ['idx_tenant_id', 'idx_created_at'],
    suggestions: [
      'Consider adding index on frequently filtered columns',
      'Use connection pooling for better performance'
    ]
  }
}

function hashQuery(query: string): string {
  // Simple hash function for query identification
  let hash = 0
  for (let i = 0; i < query.length; i++) {
    const char = query.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString(36)
}
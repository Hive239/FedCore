import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * CRITICAL SECURITY: Validates tenant access for all operations
 * This prevents cross-tenant data access vulnerabilities
 */

interface TenantContext {
  userId: string
  tenantId: string
  role: string
}

/**
 * Gets and validates the current user's tenant context
 * Throws error if user is not authenticated or has no tenant
 */
export async function getTenantContext(): Promise<TenantContext> {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error('User not authenticated')
  }
  
  // Get user's tenant - CRITICAL for security
  const { data: userTenant, error: tenantError } = await supabase
    .from('user_tenants')
    .select('tenant_id, role')
    .eq('user_id', user.id)
    .single()
  
  if (tenantError || !userTenant) {
    throw new Error('User has no tenant assignment')
  }
  
  return {
    userId: user.id,
    tenantId: userTenant.tenant_id,
    role: userTenant.role
  }
}

/**
 * Validates that a user has access to a specific tenant
 * Used in API routes to prevent unauthorized tenant access
 */
export async function validateTenantAccess(
  userId: string,
  requestedTenantId: string
): Promise<boolean> {
  const supabase = await createClient()
  
  // Check if user belongs to the requested tenant
  const { data, error } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', userId)
    .eq('tenant_id', requestedTenantId)
    .single()
  
  return !error && data !== null
}

/**
 * Ensures all database queries include tenant filtering
 * Returns a query builder with tenant filter pre-applied
 */
export async function createTenantQuery(tableName: string, tenantId: string) {
  const supabase = await createClient()
  return supabase
    .from(tableName)
    .select('*')
    .eq('tenant_id', tenantId)
}

/**
 * API route wrapper that automatically validates tenant context
 * Use this for all protected API routes
 */
export function withTenantAuth(
  handler: (request: NextRequest, context: TenantContext) => Promise<Response>
) {
  return async (request: NextRequest) => {
    try {
      const context = await getTenantContext()
      
      // If request includes tenantId, validate access
      if (request.method === 'POST' || request.method === 'PUT') {
        const body = await request.json()
        if (body.tenant_id && body.tenant_id !== context.tenantId) {
          return NextResponse.json(
            { error: 'Unauthorized tenant access' },
            { status: 403 }
          )
        }
        // Ensure tenant_id is always set correctly
        body.tenant_id = context.tenantId
        
        // Create new request with validated body
        const validatedRequest = new NextRequest(request.url, {
          method: request.method,
          headers: request.headers,
          body: JSON.stringify(body)
        })
        
        return handler(validatedRequest, context)
      }
      
      return handler(request, context)
    } catch (error) {
      console.error('Tenant auth error:', error)
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
  }
}

/**
 * Validates and sanitizes tenant-related data in request bodies
 */
export function sanitizeTenantData(data: any, tenantId: string): any {
  // Remove any tenant_id from input and replace with validated one
  const { tenant_id, ...cleanData } = data
  return {
    ...cleanData,
    tenant_id: tenantId
  }
}

/**
 * Creates RLS-compliant query for cross-tenant safe operations
 */
export async function createSecureQuery(tableName: string) {
  const context = await getTenantContext()
  const supabase = await createClient()
  
  // Always filter by tenant_id
  return supabase
    .from(tableName)
    .select('*')
    .eq('tenant_id', context.tenantId)
}
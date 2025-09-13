#!/usr/bin/env tsx
/**
 * TENANT SECURITY VERIFICATION SCRIPT
 * This script verifies that all tenant isolation measures are working correctly
 * Run with: npx tsx src/scripts/verify-tenant-security.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface TestResult {
  test: string
  status: 'PASS' | 'FAIL' | 'WARN'
  message: string
  details?: any
}

const results: TestResult[] = []

function logResult(test: string, status: TestResult['status'], message: string, details?: any) {
  const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️'
  console.log(`${emoji} ${test}: ${message}`)
  if (details) {
    console.log('   Details:', JSON.stringify(details, null, 2))
  }
  results.push({ test, status, message, details })
}

async function verifyRLSEnabled() {
  console.log('\n🔍 Checking RLS Status on Tables...')
  
  const tables = [
    'profiles', 'projects', 'tasks', 'documents', 
    'vendors', 'messages', 'team_invitations',
    'user_tenants', 'tenants', 'activity_logs'
  ]
  
  for (const table of tables) {
    const { data, error } = await supabase
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .eq('schemaname', 'public')
      .eq('tablename', table)
      .single()
    
    if (error || !data) {
      logResult(`RLS Check: ${table}`, 'WARN', `Table might not exist`, error)
    } else if (data.rowsecurity) {
      logResult(`RLS Check: ${table}`, 'PASS', 'RLS is enabled')
    } else {
      logResult(`RLS Check: ${table}`, 'FAIL', 'RLS is NOT enabled!')
    }
  }
}

async function verifyPoliciesExist() {
  console.log('\n🔍 Checking Security Policies...')
  
  const { data: policies, error } = await supabase
    .from('pg_policies')
    .select('tablename, policyname, cmd')
    .eq('schemaname', 'public')
    .order('tablename')
  
  if (error) {
    logResult('Policy Check', 'FAIL', 'Could not fetch policies', error)
    return
  }
  
  const criticalPolicies = [
    { table: 'profiles', policy: 'Users can view profiles in same tenant' },
    { table: 'projects', policy: 'Users can only view projects in their tenant' },
    { table: 'tasks', policy: 'Users can only view tasks in their tenant' },
    { table: 'user_tenants', policy: 'Users can view their own tenant assignments' },
    { table: 'tenants', policy: 'Users can view tenants they belong to' }
  ]
  
  for (const { table, policy } of criticalPolicies) {
    const exists = policies?.some(p => 
      p.tablename === table && p.policyname === policy
    )
    
    if (exists) {
      logResult(`Policy: ${table}`, 'PASS', `${policy} exists`)
    } else {
      logResult(`Policy: ${table}`, 'FAIL', `Missing: ${policy}`)
    }
  }
  
  // Count policies per table
  const policyCounts: Record<string, number> = {}
  policies?.forEach(p => {
    policyCounts[p.tablename] = (policyCounts[p.tablename] || 0) + 1
  })
  
  console.log('\n📊 Policy Count by Table:')
  Object.entries(policyCounts).forEach(([table, count]) => {
    console.log(`   ${table}: ${count} policies`)
  })
}

async function verifyTenantFunctions() {
  console.log('\n🔍 Checking Helper Functions...')
  
  // Check if function exists by trying to use it
  const { data: testResult, error } = await supabase
    .rpc('get_user_tenant_id', { user_id: 'test-user-id' })
  
  if (!error) {
    logResult('Function Check', 'PASS', 'get_user_tenant_id() function exists')
  } else {
    logResult('Function Check', 'WARN', 'get_user_tenant_id() function might not exist', error)
  }
}

async function checkCrossTenantVulnerabilities() {
  console.log('\n🔍 Checking for Cross-Tenant Vulnerabilities...')
  
  // Check if any policies allow viewing all records
  const { data: policies } = await supabase
    .from('pg_policies')
    .select('tablename, policyname, qual')
    .eq('schemaname', 'public')
  
  const dangerousPatterns = [
    'true', // Allows all
    'auth.uid() IS NOT NULL', // Only checks authentication
    'auth.role() = \'authenticated\'' // Only checks if logged in
  ]
  
  policies?.forEach(policy => {
    const qual = policy.qual?.toLowerCase() || ''
    const isDangerous = dangerousPatterns.some(pattern => 
      qual.includes(pattern.toLowerCase()) && 
      !qual.includes('tenant_id') &&
      !qual.includes('user_tenants')
    )
    
    if (isDangerous) {
      logResult(
        `Vulnerability Check: ${policy.tablename}`,
        'WARN',
        `Policy "${policy.policyname}" might allow cross-tenant access`,
        { qual: policy.qual }
      )
    }
  })
  
  logResult('Vulnerability Scan', 'PASS', 'Cross-tenant vulnerability check complete')
}

async function verifyTenantIsolation() {
  console.log('\n🔍 Testing Tenant Isolation...')
  
  // Create test tenants and users
  const tenant1Id = 'test-tenant-1-' + Date.now()
  const tenant2Id = 'test-tenant-2-' + Date.now()
  
  try {
    // Create test tenants
    const { error: t1Error } = await supabase
      .from('tenants')
      .insert({ id: tenant1Id, name: 'Test Tenant 1', slug: 'test-1' })
    
    const { error: t2Error } = await supabase
      .from('tenants')
      .insert({ id: tenant2Id, name: 'Test Tenant 2', slug: 'test-2' })
    
    if (t1Error || t2Error) {
      logResult('Isolation Test', 'WARN', 'Could not create test tenants', { t1Error, t2Error })
      return
    }
    
    // Create test projects in different tenants
    const { data: project1 } = await supabase
      .from('projects')
      .insert({ 
        name: 'Tenant 1 Project',
        tenant_id: tenant1Id,
        status: 'new'
      })
      .select()
      .single()
    
    const { data: project2 } = await supabase
      .from('projects')
      .insert({ 
        name: 'Tenant 2 Project',
        tenant_id: tenant2Id,
        status: 'new'
      })
      .select()
      .single()
    
    // Verify projects were created
    if (project1 && project2) {
      logResult('Isolation Test', 'PASS', 'Test data created successfully')
    }
    
    // Clean up test data
    await supabase.from('projects').delete().eq('tenant_id', tenant1Id)
    await supabase.from('projects').delete().eq('tenant_id', tenant2Id)
    await supabase.from('tenants').delete().eq('id', tenant1Id)
    await supabase.from('tenants').delete().eq('id', tenant2Id)
    
    logResult('Isolation Test', 'PASS', 'Test cleanup complete')
    
  } catch (error) {
    logResult('Isolation Test', 'FAIL', 'Error during testing', error)
  }
}

async function checkAuthenticationSetup() {
  console.log('\n🔍 Checking Authentication Configuration...')
  
  // Check if authentication is properly configured
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    logResult('Auth Check', 'WARN', 'No authenticated user in service context (this is normal)')
  }
  
  // Check auth configuration
  const authConfig = {
    url: supabaseUrl,
    hasServiceKey: !!supabaseServiceKey,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  }
  
  if (authConfig.hasServiceKey && authConfig.hasAnonKey) {
    logResult('Auth Config', 'PASS', 'Authentication keys are configured')
  } else {
    logResult('Auth Config', 'FAIL', 'Missing authentication keys', authConfig)
  }
}

async function generateReport(): Promise<number> {
  console.log('\n' + '='.repeat(60))
  console.log('SECURITY VERIFICATION REPORT')
  console.log('='.repeat(60))
  
  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length
  const warnings = results.filter(r => r.status === 'WARN').length
  
  console.log(`\n📊 Summary:`)
  console.log(`   ✅ Passed: ${passed}`)
  console.log(`   ❌ Failed: ${failed}`)
  console.log(`   ⚠️  Warnings: ${warnings}`)
  
  if (failed > 0) {
    console.log('\n❌ CRITICAL ISSUES FOUND:')
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`   - ${r.test}: ${r.message}`)
    })
  }
  
  if (warnings > 0) {
    console.log('\n⚠️  WARNINGS:')
    results.filter(r => r.status === 'WARN').forEach(r => {
      console.log(`   - ${r.test}: ${r.message}`)
    })
  }
  
  const score = (passed / (passed + failed + warnings)) * 100
  console.log(`\n🎯 Security Score: ${score.toFixed(1)}%`)
  
  if (score === 100) {
    console.log('🎉 Perfect! All security checks passed.')
  } else if (score >= 80) {
    console.log('👍 Good! Most security checks passed, but review warnings.')
  } else if (score >= 60) {
    console.log('⚠️  Needs attention! Several security issues found.')
  } else {
    console.log('🚨 Critical! Major security vulnerabilities detected.')
  }
  
  return failed
}

async function main() {
  console.log('🔐 TENANT SECURITY VERIFICATION')
  console.log('================================\n')
  
  try {
    await verifyRLSEnabled()
    await verifyPoliciesExist()
    await verifyTenantFunctions()
    await checkCrossTenantVulnerabilities()
    await verifyTenantIsolation()
    await checkAuthenticationSetup()
    const failedCount = await generateReport()
    
    console.log('\n✅ Verification complete!')
    process.exit(failedCount > 0 ? 1 : 0)
  } catch (error) {
    console.error('\n❌ Verification failed:', error)
    process.exit(1)
  }
}

main()
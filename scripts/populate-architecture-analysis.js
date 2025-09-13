#!/usr/bin/env node

/**
 * Script to populate Architecture Analysis data
 * This will create the necessary tables and seed them with data
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigrations() {
  console.log('🚀 Starting Architecture Analysis data population...\n')

  try {
    // Get first tenant and user
    const { data: tenants } = await supabase.from('tenants').select('id').limit(1)
    const { data: users } = await supabase.from('profiles').select('id').limit(1)
    
    if (!tenants?.length || !users?.length) {
      console.error('❌ No tenants or users found. Please set up basic data first.')
      return false
    }

    const tenantId = tenants[0].id
    const userId = users[0].id
    
    console.log(`✅ Found tenant: ${tenantId}`)
    console.log(`✅ Found user: ${userId}\n`)

    // 1. Create performance logs
    console.log('📊 Creating performance logs...')
    const performanceLogs = []
    const endpoints = ['/api/projects', '/api/tasks', '/api/dashboard', '/api/users', '/api/reports']
    const methods = ['GET', 'POST', 'PUT', 'DELETE']
    
    for (let i = 0; i < 20; i++) {
      performanceLogs.push({
        tenant_id: tenantId,
        user_id: userId,
        endpoint: endpoints[Math.floor(Math.random() * endpoints.length)],
        method: methods[Math.floor(Math.random() * methods.length)],
        response_time: Math.floor(Math.random() * 500) + 50,
        status_code: Math.random() > 0.9 ? 500 : 200,
        timestamp: new Date(Date.now() - i * 3600000).toISOString()
      })
    }
    
    const { error: perfError } = await supabase.from('performance_logs').insert(performanceLogs)
    if (perfError) {
      console.log('⚠️  Performance logs might already exist or table missing:', perfError.message)
    } else {
      console.log('✅ Created performance logs')
    }

    // 2. Create error logs
    console.log('🔴 Creating error logs...')
    const errorLogs = [
      {
        tenant_id: tenantId,
        user_id: userId,
        error_type: 'javascript',
        error_message: 'Cannot read property of undefined',
        error_stack: "TypeError: Cannot read property 'name' of undefined\\n    at Component.render",
        page_url: '/dashboard/projects',
        severity: 'medium'
      },
      {
        tenant_id: tenantId,
        user_id: userId,
        error_type: 'network',
        error_message: 'Failed to fetch',
        error_stack: 'NetworkError: Failed to fetch from /api/tasks',
        page_url: '/dashboard/tasks',
        severity: 'high'
      },
      {
        tenant_id: tenantId,
        user_id: userId,
        error_type: 'api',
        error_message: 'Database connection timeout',
        error_stack: 'Error: connect ETIMEDOUT',
        page_url: '/api/projects',
        severity: 'critical'
      }
    ]
    
    const { error: errorLogError } = await supabase.from('error_logs').insert(errorLogs)
    if (errorLogError) {
      console.log('⚠️  Error logs might already exist or table missing:', errorLogError.message)
    } else {
      console.log('✅ Created error logs')
    }

    // 3. Create security vulnerabilities
    console.log('🔒 Creating security vulnerabilities...')
    const vulnerabilities = [
      {
        tenant_id: tenantId,
        vulnerability_type: 'XSS Vulnerability',
        severity: 'high',
        status: 'open',
        description: 'Potential XSS in user input rendering',
        file_path: '/components/UserProfile.tsx',
        line_number: 45,
        cwe_id: 'CWE-79',
        owasp_category: 'A03:2021 – Injection',
        remediation: 'Sanitize user input before rendering',
        exploitability_score: 7.5,
        impact_score: 6.8
      },
      {
        tenant_id: tenantId,
        vulnerability_type: 'SQL Injection',
        severity: 'critical',
        status: 'open',
        description: 'Unsanitized input in database query',
        file_path: '/api/search/route.ts',
        line_number: 23,
        cwe_id: 'CWE-89',
        owasp_category: 'A03:2021 – Injection',
        remediation: 'Use parameterized queries',
        exploitability_score: 9.2,
        impact_score: 8.5
      },
      {
        tenant_id: tenantId,
        vulnerability_type: 'Weak Cryptography',
        severity: 'medium',
        status: 'in_progress',
        description: 'Use of MD5 hashing algorithm',
        file_path: '/lib/crypto.ts',
        line_number: 12,
        cwe_id: 'CWE-327',
        owasp_category: 'A02:2021 – Cryptographic Failures',
        remediation: 'Upgrade to SHA-256 or bcrypt',
        exploitability_score: 5.5,
        impact_score: 4.2
      }
    ]
    
    const { error: vulnError } = await supabase.from('security_vulnerabilities').insert(vulnerabilities)
    if (vulnError) {
      console.log('⚠️  Security vulnerabilities might already exist or table missing:', vulnError.message)
    } else {
      console.log('✅ Created security vulnerabilities')
    }

    // 4. Create compliance tracking
    console.log('📋 Creating compliance tracking...')
    const compliance = [
      {
        tenant_id: tenantId,
        framework: 'SOC 2',
        compliant: false,
        compliance_percentage: 75,
        controls_passed: 18,
        controls_total: 24,
        last_audit_date: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
        next_audit_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        tenant_id: tenantId,
        framework: 'GDPR',
        compliant: true,
        compliance_percentage: 95,
        controls_passed: 28,
        controls_total: 30,
        last_audit_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        next_audit_date: new Date(Date.now() + 270 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        tenant_id: tenantId,
        framework: 'ISO 27001',
        compliant: true,
        compliance_percentage: 88,
        controls_passed: 22,
        controls_total: 25,
        last_audit_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        next_audit_date: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
    
    const { error: compError } = await supabase.from('compliance_tracking').insert(compliance)
    if (compError) {
      console.log('⚠️  Compliance tracking might already exist or table missing:', compError.message)
    } else {
      console.log('✅ Created compliance tracking')
    }

    // 5. Create architecture analysis report
    console.log('📈 Creating architecture analysis report...')
    const reportId = `analysis-${Date.now()}`
    const report = {
      id: reportId,
      tenant_id: tenantId,
      production_readiness_score: 78,
      report_data: {
        codeQuality: {
          cyclomaticComplexity: 8.5,
          maintainabilityIndex: 82.3,
          technicalDebt: 45,
          testCoverage: 73,
          documentationCoverage: 65,
          linesOfCode: 15420
        },
        security: {
          vulnerabilities: [
            {
              severity: 'high',
              type: 'XSS Vulnerability',
              file: '/components/UserProfile.tsx',
              description: 'Potential XSS in user input rendering'
            },
            {
              severity: 'critical',
              type: 'SQL Injection',
              file: '/api/search/route.ts',
              description: 'Unsanitized input in database query'
            }
          ],
          securityScore: 72
        },
        architectureMetrics: {
          modularity: 85,
          coupling: 78,
          cohesion: 82,
          scalability: 80
        },
        dependencies: {
          outdated: [
            { name: 'react', current: '^17.0.0', latest: '18.2.0', vulnerability: false },
            { name: 'lodash', current: '^4.17.19', latest: '4.17.21', vulnerability: true },
            { name: 'express', current: '^4.18.0', latest: '4.18.2', vulnerability: false }
          ],
          unused: ['moment', 'jquery', 'underscore']
        },
        mlInsights: {
          patterns: [
            {
              pattern: 'Frequent database queries in loops',
              frequency: 23,
              impact: 'negative',
              confidence: 0.87
            },
            {
              pattern: 'Consistent error handling patterns',
              frequency: 45,
              impact: 'positive',
              confidence: 0.92
            },
            {
              pattern: 'Component reusability high',
              frequency: 67,
              impact: 'positive',
              confidence: 0.89
            }
          ],
          predictions: [
            { metric: 'complexity', current: 8.5, predicted30Days: 9.2, confidence: 0.78 },
            { metric: 'performance', current: 125, predicted30Days: 118, confidence: 0.82 },
            { metric: 'security', current: 72, predicted30Days: 75, confidence: 0.75 }
          ],
          anomalies: [
            {
              type: 'Performance Spike',
              severity: 'medium',
              description: 'Response times increased by 40% in the last week'
            },
            {
              type: 'Error Rate Increase',
              severity: 'high',
              description: 'JavaScript errors increased by 60% after latest deployment'
            }
          ]
        },
        recommendations: {
          immediate: [
            'Fix critical SQL injection vulnerability in search API',
            'Update lodash dependency to resolve security vulnerability',
            'Implement proper input sanitization for XSS prevention'
          ],
          shortTerm: [
            'Increase test coverage from 73% to 85%',
            'Refactor database query patterns to reduce N+1 queries',
            'Implement comprehensive error logging system'
          ],
          longTerm: [
            'Migrate to React 18 for performance improvements',
            'Implement comprehensive security audit program',
            'Establish automated dependency vulnerability scanning'
          ]
        }
      },
      analyzed_by: 'system',
      created_by: userId
    }
    
    const { error: reportError } = await supabase.from('architecture_analysis_reports').insert(report)
    if (reportError) {
      console.log('⚠️  Architecture report might already exist or table missing:', reportError.message)
    } else {
      console.log('✅ Created architecture analysis report')
    }

    console.log('\n✨ Architecture Analysis data population completed!')
    console.log('📍 Visit /architecture-analysis to see the populated data')
    
    return true

  } catch (error) {
    console.error('❌ Error populating data:', error)
    return false
  }
}

// Run the script
runMigrations().then(success => {
  process.exit(success ? 0 : 1)
})
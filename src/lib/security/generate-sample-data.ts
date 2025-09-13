import { createClient } from '@/lib/supabase/client'

// Generate sample security data for demonstration
export async function generateSampleSecurityData() {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  
  const tenantId = user.id
  
  // Sample security events
  const sampleEvents = [
    {
      tenant_id: tenantId,
      event_type: 'authentication_failure',
      severity: 'high',
      source_ip: '192.168.1.100',
      user_id: user.id,
      endpoint: '/api/auth/login',
      method: 'POST',
      response_status: 401,
      blocked: true,
      threat_score: 75,
      geolocation: { country: 'United States', city: 'New York' },
      created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString()
    },
    {
      tenant_id: tenantId,
      event_type: 'suspicious_activity',
      severity: 'medium',
      source_ip: '10.0.0.50',
      user_id: user.id,
      endpoint: '/api/projects',
      method: 'DELETE',
      response_status: 403,
      blocked: true,
      threat_score: 60,
      geolocation: { country: 'Canada', city: 'Toronto' },
      created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString()
    },
    {
      tenant_id: tenantId,
      event_type: 'sql_injection_attempt',
      severity: 'critical',
      source_ip: '203.0.113.0',
      endpoint: '/api/users',
      method: 'GET',
      response_status: 400,
      blocked: true,
      threat_score: 95,
      geolocation: { country: 'China', city: 'Beijing' },
      created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString()
    },
    {
      tenant_id: tenantId,
      event_type: 'rate_limit_exceeded',
      severity: 'low',
      source_ip: '172.16.0.1',
      user_id: user.id,
      endpoint: '/api/reports',
      method: 'GET',
      response_status: 429,
      blocked: false,
      threat_score: 30,
      geolocation: { country: 'United States', city: 'San Francisco' },
      created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString()
    },
    {
      tenant_id: tenantId,
      event_type: 'unauthorized_access',
      severity: 'high',
      source_ip: '198.51.100.0',
      endpoint: '/api/admin',
      method: 'POST',
      response_status: 403,
      blocked: true,
      threat_score: 80,
      geolocation: { country: 'Russia', city: 'Moscow' },
      created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString()
    }
  ]
  
  // Sample AI threat predictions
  const samplePredictions = [
    {
      tenant_id: tenantId,
      prediction_type: 'ddos_attack',
      threat_category: 'Network Attack',
      probability: 0.78,
      predicted_impact: 'high',
      predicted_timeframe: 'Next 24-48 hours',
      confidence_score: 0.85,
      risk_factors: { 
        recent_scans: 5,
        failed_attempts: 12,
        suspicious_patterns: true
      },
      recommended_actions: [
        'Enable rate limiting',
        'Configure DDoS protection',
        'Monitor traffic patterns'
      ],
      model_version: 'v2.3.1',
      created_at: new Date().toISOString()
    },
    {
      tenant_id: tenantId,
      prediction_type: 'credential_stuffing',
      threat_category: 'Authentication Attack',
      probability: 0.65,
      predicted_impact: 'medium',
      predicted_timeframe: 'Next 7 days',
      confidence_score: 0.72,
      risk_factors: {
        weak_passwords: 3,
        no_mfa: 8,
        recent_breaches: true
      },
      recommended_actions: [
        'Enforce MFA',
        'Implement password policies',
        'Monitor login attempts'
      ],
      model_version: 'v2.3.1',
      created_at: new Date().toISOString()
    }
  ]
  
  // Sample vulnerability scans
  const sampleScans = [
    {
      tenant_id: tenantId,
      scan_type: 'Infrastructure',
      target: 'Production Servers',
      vulnerabilities_found: 23,
      critical_count: 2,
      high_count: 5,
      medium_count: 10,
      low_count: 6,
      scan_duration: 3600,
      auto_patched: 8,
      created_at: new Date().toISOString()
    },
    {
      tenant_id: tenantId,
      scan_type: 'Application',
      target: 'Web Application',
      vulnerabilities_found: 15,
      critical_count: 1,
      high_count: 3,
      medium_count: 7,
      low_count: 4,
      scan_duration: 1800,
      auto_patched: 5,
      created_at: new Date().toISOString()
    }
  ]
  
  // Sample zero trust access logs
  const sampleZeroTrust = [
    {
      tenant_id: tenantId,
      user_id: user.id,
      resource_type: 'Database',
      resource_id: 'prod-db-01',
      access_granted: true,
      trust_score: 0.92,
      mfa_verified: true,
      device_compliance: true,
      created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString()
    },
    {
      tenant_id: tenantId,
      user_id: user.id,
      resource_type: 'API',
      resource_id: 'payment-gateway',
      access_granted: false,
      trust_score: 0.45,
      mfa_verified: false,
      device_compliance: true,
      denial_reason: 'MFA required for sensitive resources',
      created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString()
    },
    {
      tenant_id: tenantId,
      user_id: user.id,
      resource_type: 'File Storage',
      resource_id: 'confidential-docs',
      access_granted: true,
      trust_score: 0.88,
      mfa_verified: true,
      device_compliance: true,
      created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString()
    }
  ]
  
  // Sample compliance records
  const sampleCompliance = [
    {
      tenant_id: tenantId,
      framework: 'SOC 2 Type II',
      audit_type: 'Annual',
      status: 'compliant',
      compliance_score: 94,
      created_at: new Date().toISOString()
    },
    {
      tenant_id: tenantId,
      framework: 'ISO 27001',
      audit_type: 'Certification',
      status: 'compliant',
      compliance_score: 91,
      created_at: new Date().toISOString()
    },
    {
      tenant_id: tenantId,
      framework: 'GDPR',
      audit_type: 'Quarterly',
      status: 'compliant',
      compliance_score: 88,
      created_at: new Date().toISOString()
    }
  ]
  
  // Sample mobile devices
  const sampleMobileDevices = [
    {
      tenant_id: tenantId,
      user_id: user.id,
      device_type: 'iOS',
      device_model: 'iPhone 14 Pro',
      security_status: 'secure',
      encryption_enabled: true,
      screen_lock_enabled: true,
      jailbroken_rooted: false,
      remote_wipe_enabled: true,
      created_at: new Date().toISOString()
    },
    {
      tenant_id: tenantId,
      user_id: user.id,
      device_type: 'Android',
      device_model: 'Samsung Galaxy S23',
      security_status: 'warning',
      encryption_enabled: true,
      screen_lock_enabled: false,
      jailbroken_rooted: false,
      remote_wipe_enabled: true,
      created_at: new Date().toISOString()
    }
  ]
  
  // Sample supply chain components
  const sampleSupplyChain = [
    {
      tenant_id: tenantId,
      component_name: 'React',
      vendor_name: 'Meta',
      component_type: 'Frontend Framework',
      version: '18.2.0',
      risk_score: 15,
      sbom_available: true,
      verified_signature: true,
      license_compliance: true,
      created_at: new Date().toISOString()
    },
    {
      tenant_id: tenantId,
      component_name: 'Node.js',
      vendor_name: 'OpenJS Foundation',
      component_type: 'Runtime',
      version: '20.11.0',
      risk_score: 20,
      sbom_available: true,
      verified_signature: true,
      license_compliance: true,
      created_at: new Date().toISOString()
    },
    {
      tenant_id: tenantId,
      component_name: 'PostgreSQL',
      vendor_name: 'PostgreSQL Global Development Group',
      component_type: 'Database',
      version: '15.3',
      risk_score: 10,
      sbom_available: true,
      verified_signature: true,
      license_compliance: true,
      created_at: new Date().toISOString()
    }
  ]
  
  try {
    // Insert sample data
    const results = await Promise.allSettled([
      supabase.from('security_events').upsert(sampleEvents),
      supabase.from('ai_threat_predictions').upsert(samplePredictions),
      supabase.from('vulnerability_scans').upsert(sampleScans),
      supabase.from('zero_trust_access').upsert(sampleZeroTrust),
      supabase.from('compliance_records').upsert(sampleCompliance),
      supabase.from('mobile_device_security').upsert(sampleMobileDevices),
      supabase.from('supply_chain_security').upsert(sampleSupplyChain)
    ])
    
    const errors = results.filter(r => r.status === 'rejected')
    if (errors.length > 0) {
      console.error('Some sample data failed to insert:', errors)
    }
    
    return { success: true, message: 'Sample security data generated successfully' }
  } catch (error) {
    console.error('Error generating sample security data:', error)
    return { error: 'Failed to generate sample security data' }
  }
}
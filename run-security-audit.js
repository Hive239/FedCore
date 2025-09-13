#!/usr/bin/env node

/**
 * Run Enterprise Architecture Security Audit
 * This will analyze the entire codebase for RLS and multi-tenant security issues
 */

const fetch = require('node-fetch');

async function runSecurityAudit() {
  console.log('🔐 Starting Enterprise Architecture Security Audit...\n');
  
  try {
    // Note: You need to be logged in to run this
    // Replace with your actual session cookie from browser DevTools
    const response = await fetch('http://localhost:3000/api/architecture/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Get this from your browser's DevTools > Application > Cookies
        'Cookie': 'your-session-cookie-here'
      },
      body: JSON.stringify({
        scanType: 'security',
        focus: ['multi-tenant', 'RLS', 'tenant-isolation'],
        depth: 'comprehensive'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Analysis failed:', error);
      
      if (response.status === 401) {
        console.log('\n⚠️  You need to be authenticated to run this analysis.');
        console.log('Steps to fix:');
        console.log('1. Open http://localhost:3000 in your browser');
        console.log('2. Log in to your account');
        console.log('3. Open DevTools (F12) > Application > Cookies');
        console.log('4. Copy all cookie values');
        console.log('5. Replace "your-session-cookie-here" in this script with your cookies');
      }
      return;
    }

    const result = await response.json();
    console.log('✅ Analysis completed successfully!');
    console.log('Report ID:', result.reportId);
    console.log('\n📊 Check the following locations for results:');
    console.log('- Supabase Dashboard > architecture_analysis_reports table');
    console.log('- Supabase Dashboard > security_vulnerabilities table');
    console.log('- Frontend: http://localhost:3000/reports');
    
  } catch (error) {
    console.error('❌ Error running analysis:', error);
  }
}

// Alternative: Direct analysis without API
async function directAnalysis() {
  console.log('\n🔍 Running direct code analysis for multi-tenant issues...\n');
  
  const { EnterpriseArchitectureAnalyzer } = require('./src/lib/architecture-analyzer-enterprise');
  
  const analyzer = new EnterpriseArchitectureAnalyzer();
  const report = await analyzer.analyzeEnterprise();
  
  console.log('📊 SECURITY ANALYSIS REPORT');
  console.log('=' .repeat(60));
  
  // Filter for multi-tenant vulnerabilities
  const tenantVulns = report.security.vulnerabilities.filter(v => 
    v.type.includes('Tenant') || 
    v.type.includes('RLS') || 
    v.type.includes('Cross-Tenant')
  );
  
  if (tenantVulns.length > 0) {
    console.log(`\n🚨 CRITICAL: Found ${tenantVulns.length} multi-tenant security issues:\n`);
    
    tenantVulns.forEach((vuln, index) => {
      console.log(`${index + 1}. ${vuln.type}`);
      console.log(`   File: ${vuln.file}`);
      console.log(`   Severity: ${vuln.severity.toUpperCase()}`);
      console.log(`   Description: ${vuln.description}`);
      console.log(`   Fix: ${vuln.remediation}`);
      console.log('');
    });
  } else {
    console.log('\n✅ No multi-tenant security issues found!');
  }
  
  // Summary
  console.log('\n📈 SUMMARY');
  console.log('=' .repeat(60));
  console.log(`Production Readiness Score: ${report.productionReadinessScore}/100`);
  console.log(`Security Score: ${report.security.securityScore}/100`);
  console.log(`Total Vulnerabilities: ${report.security.vulnerabilities.length}`);
  console.log(`Critical Issues: ${report.security.vulnerabilities.filter(v => v.severity === 'critical').length}`);
  
  return report;
}

// Check if running via API or direct
if (process.argv.includes('--direct')) {
  directAnalysis().catch(console.error);
} else {
  runSecurityAudit().catch(console.error);
}
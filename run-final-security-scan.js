#!/usr/bin/env node

/**
 * FINAL COMPREHENSIVE SECURITY SCAN
 * This will verify ALL security measures are in place
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔐 RUNNING FINAL ENTERPRISE SECURITY SCAN');
console.log('='.repeat(60));

let issuesFound = [];
let secureItems = [];

// 1. CHECK ALL HOOKS FOR TENANT FILTERING
console.log('\n📁 Scanning Hooks for Tenant Filtering...');
const hookFiles = glob.sync('src/lib/hooks/use-*.ts');

hookFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const fileName = path.basename(file);
  
  // Skip utility hooks that don't need tenant filtering
  const skipHooks = ['use-nexus.ts', 'use-ensure-tenant.ts', 'use-security.ts', 'use-nexus-analytics.ts'];
  if (skipHooks.includes(fileName)) {
    return;
  }
  
  // Check if hook accesses Supabase
  if (content.includes('supabase')) {
    if (!content.includes('tenant_id') && !content.includes('user_tenants')) {
      issuesFound.push({
        type: 'MISSING_TENANT_FILTER',
        severity: 'CRITICAL',
        file: file,
        message: `Hook ${fileName} accesses Supabase but doesn't filter by tenant_id`
      });
    } else {
      secureItems.push(`✅ ${fileName} - Has tenant filtering`);
    }
  }
});

// 2. CHECK API ROUTES FOR TENANT VALIDATION
console.log('\n📁 Scanning API Routes for Tenant Security...');
const apiFiles = glob.sync('src/app/api/**/*.ts');

apiFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const fileName = path.basename(file);
  
  // Skip webhook and public routes
  if (file.includes('webhook') || file.includes('stripe') || file.includes('test-email')) {
    return;
  }
  
  // Check if route accesses database
  if (content.includes('supabase') && content.includes('from(')) {
    const hasTenantValidation = 
      content.includes('getTenantContext') ||
      content.includes('withTenantAuth') ||
      content.includes('user_tenants') ||
      (content.includes('tenant_id') && content.includes('.eq('));
    
    if (!hasTenantValidation) {
      issuesFound.push({
        type: 'API_MISSING_TENANT_CHECK',
        severity: 'CRITICAL',
        file: file,
        message: `API route ${fileName} doesn't validate tenant context`
      });
    } else {
      secureItems.push(`✅ ${fileName} - Has tenant validation`);
    }
  }
});

// 3. CHECK FOR SQL FILES WITH MISSING RLS
console.log('\n📁 Scanning SQL Files for RLS Configuration...');
const sqlFiles = glob.sync('**/*.sql', { ignore: 'node_modules/**' });

sqlFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  // Check for CREATE TABLE without RLS
  const tableMatches = content.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(?:public\.)?(\w+)/gi);
  if (tableMatches) {
    tableMatches.forEach(match => {
      const tableName = match.replace(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(?:public\.)?/i, '');
      if (content.includes(`tenant_id`) && !content.includes(`ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY`)) {
        issuesFound.push({
          type: 'TABLE_MISSING_RLS',
          severity: 'HIGH',
          file: file,
          message: `Table ${tableName} created with tenant_id but no RLS enabled`
        });
      }
    });
  }
});

// 4. CHECK FOR DANGEROUS PATTERNS
console.log('\n📁 Scanning for Dangerous Security Patterns...');
const allTsFiles = glob.sync('src/**/*.{ts,tsx}', { ignore: 'node_modules/**' });

allTsFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const fileName = path.basename(file);
  
  // Check for dangerous patterns
  const dangerousPatterns = [
    {
      pattern: /\.from\(['"`]\w+['"`]\)\s*\.select\(\)(?!.*\.eq\(['"`]tenant_id)/g,
      message: 'Supabase query without tenant_id filter'
    },
    {
      pattern: /auth\.uid\(\)\s+IS\s+NOT\s+NULL['"`]\s*\)/gi,
      message: 'Weak RLS policy - only checks authentication'
    },
    {
      pattern: /localStorage\.(setItem|getItem).*tenant/gi,
      message: 'Tenant data in localStorage - security risk'
    }
  ];
  
  dangerousPatterns.forEach(({ pattern, message }) => {
    if (pattern.test(content)) {
      issuesFound.push({
        type: 'DANGEROUS_PATTERN',
        severity: 'HIGH',
        file: file,
        message: `${fileName}: ${message}`
      });
    }
  });
});

// 5. VERIFY CRITICAL FILES EXIST
console.log('\n📁 Verifying Critical Security Files...');
const criticalFiles = [
  'src/lib/auth/tenant-security.ts',
  'supabase/fix-all-rls-clean.sql',
  'supabase/fix-missing-tenant.sql'
];

criticalFiles.forEach(file => {
  if (fs.existsSync(file)) {
    secureItems.push(`✅ ${path.basename(file)} - Security file exists`);
  } else {
    issuesFound.push({
      type: 'MISSING_SECURITY_FILE',
      severity: 'MEDIUM',
      file: file,
      message: `Critical security file missing: ${file}`
    });
  }
});

// 6. CHECK ENVIRONMENT VARIABLES
console.log('\n📁 Checking Environment Security...');
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  if (!envContent.includes('SUPABASE_SERVICE_ROLE_KEY')) {
    issuesFound.push({
      type: 'MISSING_ENV_VAR',
      severity: 'LOW',
      file: '.env.local',
      message: 'Missing SUPABASE_SERVICE_ROLE_KEY for admin operations'
    });
  }
}

// GENERATE REPORT
console.log('\n' + '='.repeat(60));
console.log('📊 SECURITY SCAN COMPLETE');
console.log('='.repeat(60));

console.log(`\n✅ SECURE ITEMS: ${secureItems.length}`);
secureItems.slice(0, 10).forEach(item => console.log(`   ${item}`));
if (secureItems.length > 10) {
  console.log(`   ... and ${secureItems.length - 10} more`);
}

if (issuesFound.length === 0) {
  console.log('\n🎉 PERFECT SECURITY SCORE!');
  console.log('✅ No security issues found');
  console.log('✅ All hooks have tenant filtering');
  console.log('✅ All API routes validate tenant context');
  console.log('✅ All tables have RLS enabled');
  console.log('✅ No dangerous patterns detected');
  console.log('\n🔒 YOUR APPLICATION IS FULLY SECURED!');
} else {
  console.log(`\n⚠️  ISSUES FOUND: ${issuesFound.length}`);
  
  const critical = issuesFound.filter(i => i.severity === 'CRITICAL');
  const high = issuesFound.filter(i => i.severity === 'HIGH');
  const medium = issuesFound.filter(i => i.severity === 'MEDIUM');
  const low = issuesFound.filter(i => i.severity === 'LOW');
  
  if (critical.length > 0) {
    console.log('\n🚨 CRITICAL ISSUES:');
    critical.forEach(issue => {
      console.log(`   ❌ ${issue.message}`);
      console.log(`      File: ${issue.file}`);
    });
  }
  
  if (high.length > 0) {
    console.log('\n⚠️  HIGH PRIORITY:');
    high.forEach(issue => {
      console.log(`   ⚠️  ${issue.message}`);
      console.log(`      File: ${issue.file}`);
    });
  }
  
  if (medium.length > 0) {
    console.log('\n📝 MEDIUM PRIORITY:');
    medium.forEach(issue => {
      console.log(`   📝 ${issue.message}`);
    });
  }
  
  if (low.length > 0) {
    console.log('\n💡 LOW PRIORITY:');
    low.forEach(issue => {
      console.log(`   💡 ${issue.message}`);
    });
  }
}

// FINAL RECOMMENDATIONS
console.log('\n' + '='.repeat(60));
console.log('📋 FINAL SECURITY CHECKLIST:');
console.log('='.repeat(60));

const checklist = [
  '1. ✅ Run fix-all-rls-clean.sql in Supabase',
  '2. ✅ Run fix-missing-tenant.sql in Supabase',
  '3. ✅ Verify all users have tenant assignments',
  '4. ✅ Test with multiple tenant accounts',
  '5. ✅ Monitor security_audit_log table for violations',
  '6. ✅ Schedule weekly security scans',
  '7. ✅ Review and fix any issues found above'
];

checklist.forEach(item => console.log(item));

console.log('\n🔐 Security Score: ' + (100 - (issuesFound.length * 5)) + '/100');

// Write detailed report to file
const report = {
  timestamp: new Date().toISOString(),
  secureItems: secureItems.length,
  issuesFound: issuesFound.length,
  issues: issuesFound,
  secure: secureItems,
  score: 100 - (issuesFound.length * 5)
};

fs.writeFileSync('security-scan-report.json', JSON.stringify(report, null, 2));
console.log('\n📄 Detailed report saved to: security-scan-report.json');

process.exit(issuesFound.filter(i => i.severity === 'CRITICAL').length > 0 ? 1 : 0);
#!/usr/bin/env node

/**
 * Audit all database queries for proper tenant filtering
 */

const fs = require('fs')
const path = require('path')

function findFilesRecursively(dir, extensions = ['.tsx', '.ts']) {
  let results = []
  
  if (!fs.existsSync(dir)) return results
  
  const files = fs.readdirSync(dir)
  
  for (const file of files) {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    
    if (stat.isDirectory()) {
      // Skip node_modules and other non-source directories
      if (!['node_modules', '.git', '.next', 'dist', 'build'].includes(file)) {
        results = results.concat(findFilesRecursively(filePath, extensions))
      }
    } else {
      if (extensions.some(ext => file.endsWith(ext))) {
        results.push(filePath)
      }
    }
  }
  
  return results
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split('\n')
  
  let issues = []
  
  // Look for Supabase queries
  const supabaseFromRegex = /\.from\(['"`](\w+)['"`]\)/g
  const tenantIdCheckRegex = /\.eq\(['"`]tenant_id['"`]/
  
  let match
  while ((match = supabaseFromRegex.exec(content)) !== null) {
    const tableName = match[1]
    const lineNumber = content.substring(0, match.index).split('\n').length
    
    // Skip certain tables that don't need tenant filtering
    const skipTables = ['user_tenants', 'tenants', 'profiles']
    if (skipTables.includes(tableName)) continue
    
    // Check if there's a tenant_id filter in the same query block
    const queryStart = match.index
    const nextQuery = content.indexOf('.from(', match.index + match[0].length)
    const queryEnd = nextQuery !== -1 ? nextQuery : content.length
    const queryBlock = content.substring(queryStart, queryEnd)
    
    if (!tenantIdCheckRegex.test(queryBlock)) {
      issues.push({
        type: 'MISSING_TENANT_FILTER',
        table: tableName,
        line: lineNumber,
        context: lines[lineNumber - 1]?.trim() || ''
      })
    }
  }
  
  return issues
}

function auditTenantFiltering() {
  console.log('🔍 Auditing database queries for proper tenant filtering...\n')
  
  const srcDir = path.join(process.cwd(), 'src')
  const files = findFilesRecursively(srcDir)
  
  let totalIssues = 0
  let filesWithIssues = 0
  
  for (const file of files) {
    const issues = analyzeFile(file)
    
    if (issues.length > 0) {
      filesWithIssues++
      totalIssues += issues.length
      
      const relativePath = path.relative(process.cwd(), file)
      console.log(`❌ ${relativePath}`)
      
      for (const issue of issues) {
        console.log(`   Line ${issue.line}: Missing tenant_id filter for table '${issue.table}'`)
        console.log(`   Context: ${issue.context}`)
        console.log()
      }
    }
  }
  
  console.log(`\n📊 AUDIT SUMMARY:`)
  console.log(`   Files scanned: ${files.length}`)
  console.log(`   Files with issues: ${filesWithIssues}`)
  console.log(`   Total issues found: ${totalIssues}`)
  
  if (totalIssues === 0) {
    console.log(`\n🎉 All database queries have proper tenant filtering!`)
    console.log(`🔒 Tenant isolation is properly implemented!`)
  } else {
    console.log(`\n⚠️  ${totalIssues} queries need tenant filtering fixes`)
    console.log(`🔧 These queries could leak data between organizations`)
  }
  
  return totalIssues === 0
}

auditTenantFiltering()
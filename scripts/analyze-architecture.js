#!/usr/bin/env node

/**
 * Architecture Analysis CLI
 * Run: npm run analyze
 */

const { ArchitectureAnalyzer } = require('../src/lib/architecture-analyzer.ts')
const fs = require('fs')
const path = require('path')

async function main() {
  console.log('🔍 Starting Project Pro Architecture Analysis...\n')
  
  const analyzer = new ArchitectureAnalyzer(process.cwd())
  const report = await analyzer.analyze()
  
  // Display results
  console.log('=' .repeat(80))
  console.log('ARCHITECTURE ANALYSIS REPORT')
  console.log('=' .repeat(80))
  console.log(`Timestamp: ${report.timestamp.toISOString()}`)
  console.log('\n📊 METRICS:')
  console.log('-'.repeat(40))
  console.log(`Total Files Analyzed: ${report.metrics.totalFiles}`)
  console.log(`Duplicate Code Found: ${report.metrics.duplicateCode}`)
  console.log(`Demo Code Remaining: ${report.metrics.demoCodeRemaining}`)
  console.log(`Hardcoded Values: ${report.metrics.hardcodedValues}`)
  console.log(`TODO Comments: ${report.metrics.todoComments}`)
  console.log(`Unused Exports: ${report.metrics.unusedExports}`)
  
  // Group issues by severity
  const critical = report.issues.filter(i => i.severity === 'critical')
  const high = report.issues.filter(i => i.severity === 'high')
  const medium = report.issues.filter(i => i.severity === 'medium')
  const low = report.issues.filter(i => i.severity === 'low')
  
  if (critical.length > 0) {
    console.log('\n🚨 CRITICAL ISSUES:')
    console.log('-'.repeat(40))
    critical.forEach(issue => {
      console.log(`\n  📍 ${issue.file}`)
      console.log(`     ${issue.description}`)
      console.log(`     💡 ${issue.suggestion}`)
    })
  }
  
  if (high.length > 0) {
    console.log('\n⚠️  HIGH PRIORITY ISSUES:')
    console.log('-'.repeat(40))
    high.forEach(issue => {
      console.log(`\n  📍 ${issue.file}`)
      console.log(`     ${issue.description}`)
      console.log(`     💡 ${issue.suggestion}`)
    })
  }
  
  if (medium.length > 0) {
    console.log('\n⚡ MEDIUM PRIORITY ISSUES:')
    console.log('-'.repeat(40))
    medium.slice(0, 5).forEach(issue => {
      console.log(`  • ${path.basename(issue.file)}: ${issue.description}`)
    })
    if (medium.length > 5) {
      console.log(`  ... and ${medium.length - 5} more`)
    }
  }
  
  if (low.length > 0) {
    console.log('\n💡 LOW PRIORITY ISSUES:')
    console.log('-'.repeat(40))
    console.log(`  Found ${low.length} low priority issues (see full report for details)`)
  }
  
  console.log('\n📝 RECOMMENDATIONS:')
  console.log('-'.repeat(40))
  report.recommendations.forEach((rec, i) => {
    console.log(`${i + 1}. ${rec}`)
  })
  
  // Save detailed report
  const reportPath = path.join(process.cwd(), 'architecture-report.json')
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`\n✅ Full report saved to: ${reportPath}`)
  
  // Exit with error code if critical issues found
  if (critical.length > 0) {
    console.log('\n❌ Analysis failed: Critical issues must be resolved')
    process.exit(1)
  } else {
    console.log('\n✅ Analysis complete')
    process.exit(0)
  }
}

main().catch(error => {
  console.error('Error running analysis:', error)
  process.exit(1)
})
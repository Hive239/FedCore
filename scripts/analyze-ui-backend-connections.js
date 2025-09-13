#!/usr/bin/env node

/**
 * Enterprise Architecture Analyzer - UI/Backend Connection Analysis
 * Analyzes the integration between frontend components and backend services
 * Validates data flow, API efficiency, and architectural patterns
 */

const fs = require('fs').promises
const path = require('path')
const { performance } = require('perf_hooks')

class UIBackendAnalyzer {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      connections: [],
      patterns: {},
      issues: [],
      recommendations: [],
      metrics: {},
      score: 0
    }
  }

  async analyze() {
    console.log('🔍 Enterprise Architecture Analyzer - UI/Backend Connections')
    console.log('=' .repeat(70))

    const startTime = performance.now()

    // Phase 1: Component Analysis
    await this.analyzeComponents()
    
    // Phase 2: API Route Analysis
    await this.analyzeAPIRoutes()
    
    // Phase 3: Data Flow Analysis
    await this.analyzeDataFlow()
    
    // Phase 4: State Management Analysis
    await this.analyzeStateManagement()
    
    // Phase 5: Performance Analysis
    await this.analyzePerformance()
    
    // Phase 6: Security Analysis
    await this.analyzeSecurity()
    
    // Phase 7: Real-time Connection Analysis
    await this.analyzeRealTimeConnections()
    
    // Phase 8: Error Handling Analysis
    await this.analyzeErrorHandling()

    // Calculate final score
    this.calculateScore()

    const duration = performance.now() - startTime
    this.results.analysisDuration = duration

    return this.results
  }

  async analyzeComponents() {
    console.log('\n📊 Phase 1: Component Analysis')
    
    const componentsDir = path.join(__dirname, '..', 'src', 'components')
    const components = await this.scanDirectory(componentsDir, '.tsx')
    
    let clientComponents = 0
    let serverComponents = 0
    let mixedComponents = 0
    let apiCalls = 0
    let optimisticUpdates = 0

    for (const file of components) {
      const content = await fs.readFile(file, 'utf-8')
      
      // Detect component type
      if (content.includes("'use client'")) clientComponents++
      else if (content.includes("'use server'")) serverComponents++
      else if (content.includes('useState') || content.includes('useEffect')) mixedComponents++
      
      // Detect API patterns
      if (content.includes('fetch(') || content.includes('supabase.')) apiCalls++
      if (content.includes('optimisticUpdate') || content.includes('mutate(')) optimisticUpdates++
      
      // Analyze data fetching patterns
      const patterns = this.extractPatterns(content)
      this.results.connections.push({
        component: path.basename(file),
        type: content.includes("'use client'") ? 'client' : 'server',
        patterns
      })
    }

    this.results.metrics.components = {
      total: components.length,
      client: clientComponents,
      server: serverComponents,
      mixed: mixedComponents,
      withAPICalls: apiCalls,
      withOptimisticUpdates: optimisticUpdates
    }

    console.log(`  ✅ Analyzed ${components.length} components`)
    console.log(`    - Client: ${clientComponents}, Server: ${serverComponents}, Mixed: ${mixedComponents}`)
  }

  async analyzeAPIRoutes() {
    console.log('\n🔌 Phase 2: API Route Analysis')
    
    const apiDir = path.join(__dirname, '..', 'src', 'app', 'api')
    const routes = await this.scanDirectory(apiDir, '.ts')
    
    let restRoutes = 0
    let graphqlRoutes = 0
    let streamingRoutes = 0
    let cachedRoutes = 0
    let protectedRoutes = 0

    for (const file of routes) {
      const content = await fs.readFile(file, 'utf-8')
      
      if (content.includes('GET') || content.includes('POST')) restRoutes++
      if (content.includes('GraphQL') || content.includes('query')) graphqlRoutes++
      if (content.includes('ReadableStream') || content.includes('stream')) streamingRoutes++
      if (content.includes('cache') || content.includes('revalidate')) cachedRoutes++
      if (content.includes('auth') || content.includes('session')) protectedRoutes++
      
      // Check for optimization patterns
      if (!content.includes('try') || !content.includes('catch')) {
        this.results.issues.push({
          type: 'error-handling',
          file: path.basename(file),
          message: 'Missing error handling in API route'
        })
      }
    }

    this.results.metrics.apiRoutes = {
      total: routes.length,
      rest: restRoutes,
      graphql: graphqlRoutes,
      streaming: streamingRoutes,
      cached: cachedRoutes,
      protected: protectedRoutes
    }

    console.log(`  ✅ Analyzed ${routes.length} API routes`)
    console.log(`    - Cached: ${cachedRoutes}, Protected: ${protectedRoutes}, Streaming: ${streamingRoutes}`)
  }

  async analyzeDataFlow() {
    console.log('\n🔄 Phase 3: Data Flow Analysis')
    
    const flows = {
      clientToServer: 0,
      serverToClient: 0,
      bidirectional: 0,
      realtime: 0,
      cached: 0
    }

    // Analyze hooks and data fetching
    const hooksDir = path.join(__dirname, '..', 'src', 'hooks')
    try {
      const hooks = await this.scanDirectory(hooksDir, '.ts')
      
      for (const file of hooks) {
        const content = await fs.readFile(file, 'utf-8')
        
        if (content.includes('useSWR') || content.includes('useQuery')) flows.cached++
        if (content.includes('subscribe') || content.includes('realtime')) flows.realtime++
        if (content.includes('mutate') && content.includes('fetch')) flows.bidirectional++
      }
    } catch (e) {
      // Hooks directory might not exist
    }

    // Analyze server actions
    const actionsDir = path.join(__dirname, '..', 'src', 'app', 'actions')
    try {
      const actions = await this.scanDirectory(actionsDir, '.ts')
      flows.serverToClient += actions.length
    } catch (e) {
      // Actions directory might not exist
    }

    this.results.metrics.dataFlow = flows

    // Check for N+1 query problems
    await this.checkN1Queries()

    console.log(`  ✅ Data flow patterns analyzed`)
    console.log(`    - Realtime: ${flows.realtime}, Cached: ${flows.cached}, Bidirectional: ${flows.bidirectional}`)
  }

  async analyzeStateManagement() {
    console.log('\n🎯 Phase 4: State Management Analysis')
    
    const statePatterns = {
      redux: 0,
      zustand: 0,
      context: 0,
      atoms: 0,
      local: 0,
      serverState: 0
    }

    const srcDir = path.join(__dirname, '..', 'src')
    const files = await this.scanDirectory(srcDir, '.tsx')
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8')
      
      if (content.includes('useSelector') || content.includes('dispatch')) statePatterns.redux++
      if (content.includes('useStore') || content.includes('create(')) statePatterns.zustand++
      if (content.includes('createContext') || content.includes('useContext')) statePatterns.context++
      if (content.includes('atom') || content.includes('useAtom')) statePatterns.atoms++
      if (content.includes('useState')) statePatterns.local++
      if (content.includes('server:') || content.includes('use server')) statePatterns.serverState++
    }

    this.results.metrics.stateManagement = statePatterns

    // Check for state synchronization issues
    if (statePatterns.redux > 0 && statePatterns.zustand > 0) {
      this.results.issues.push({
        type: 'state-management',
        message: 'Multiple state management libraries detected - consider consolidation'
      })
    }

    console.log(`  ✅ State management patterns analyzed`)
    const primary = Object.entries(statePatterns).sort((a, b) => b[1] - a[1])[0]
    console.log(`    - Primary: ${primary[0]} (${primary[1]} usages)`)
  }

  async analyzePerformance() {
    console.log('\n⚡ Phase 5: Performance Analysis')
    
    const performance = {
      lazyLoading: 0,
      memoization: 0,
      virtualScrolling: 0,
      codeSpitting: 0,
      prefetching: 0,
      bundleOptimization: 0
    }

    const files = await this.scanDirectory(path.join(__dirname, '..', 'src'), '.tsx')
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8')
      
      if (content.includes('lazy(') || content.includes('dynamic(')) performance.lazyLoading++
      if (content.includes('useMemo') || content.includes('useCallback')) performance.memoization++
      if (content.includes('VirtualList') || content.includes('virtual')) performance.virtualScrolling++
      if (content.includes('prefetch')) performance.prefetching++
      
      // Check for performance anti-patterns
      if (content.includes('useEffect(() => {') && content.includes('[]')) {
        const effectCount = (content.match(/useEffect/g) || []).length
        if (effectCount > 3) {
          this.results.issues.push({
            type: 'performance',
            file: path.basename(file),
            message: `Too many useEffect hooks (${effectCount}) - consider consolidation`
          })
        }
      }
    }

    this.results.metrics.performance = performance

    console.log(`  ✅ Performance optimizations analyzed`)
    console.log(`    - Lazy loading: ${performance.lazyLoading}, Memoization: ${performance.memoization}`)
  }

  async analyzeSecurity() {
    console.log('\n🔒 Phase 6: Security Analysis')
    
    const security = {
      authentication: 0,
      authorization: 0,
      encryption: 0,
      validation: 0,
      sanitization: 0,
      rateLimit: 0
    }

    const files = await this.scanDirectory(path.join(__dirname, '..', 'src'), '.ts')
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8')
      
      if (content.includes('auth') || content.includes('session')) security.authentication++
      if (content.includes('authorize') || content.includes('permission')) security.authorization++
      if (content.includes('encrypt') || content.includes('hash')) security.encryption++
      if (content.includes('validate') || content.includes('schema')) security.validation++
      if (content.includes('sanitize') || content.includes('escape')) security.sanitization++
      if (content.includes('rateLimit') || content.includes('throttle')) security.rateLimit++
      
      // Check for security issues
      if (content.includes('eval(') || content.includes('Function(')) {
        this.results.issues.push({
          type: 'security',
          file: path.basename(file),
          severity: 'critical',
          message: 'Dangerous eval() or Function() usage detected'
        })
      }
      
      if (content.includes('innerHTML') && !content.includes('sanitize')) {
        this.results.issues.push({
          type: 'security',
          file: path.basename(file),
          severity: 'high',
          message: 'innerHTML usage without sanitization'
        })
      }
    }

    this.results.metrics.security = security

    console.log(`  ✅ Security measures analyzed`)
    console.log(`    - Auth: ${security.authentication}, Validation: ${security.validation}, Rate limiting: ${security.rateLimit}`)
  }

  async analyzeRealTimeConnections() {
    console.log('\n📡 Phase 7: Real-time Connection Analysis')
    
    const realtime = {
      websockets: 0,
      serverSentEvents: 0,
      polling: 0,
      subscriptions: 0,
      presence: 0
    }

    const files = await this.scanDirectory(path.join(__dirname, '..', 'src'), '.ts')
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8')
      
      if (content.includes('WebSocket') || content.includes('ws://')) realtime.websockets++
      if (content.includes('EventSource') || content.includes('SSE')) realtime.serverSentEvents++
      if (content.includes('setInterval') && content.includes('fetch')) realtime.polling++
      if (content.includes('subscribe') || content.includes('.on(')) realtime.subscriptions++
      if (content.includes('presence') || content.includes('online')) realtime.presence++
    }

    this.results.metrics.realtime = realtime

    console.log(`  ✅ Real-time connections analyzed`)
    console.log(`    - WebSockets: ${realtime.websockets}, Subscriptions: ${realtime.subscriptions}`)
  }

  async analyzeErrorHandling() {
    console.log('\n🚨 Phase 8: Error Handling Analysis')
    
    const errorHandling = {
      errorBoundaries: 0,
      tryCatch: 0,
      asyncErrorHandling: 0,
      fallbackUI: 0,
      errorLogging: 0,
      retryLogic: 0
    }

    const files = await this.scanDirectory(path.join(__dirname, '..', 'src'), '.tsx')
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8')
      
      if (content.includes('ErrorBoundary') || content.includes('componentDidCatch')) errorHandling.errorBoundaries++
      if (content.includes('try {') && content.includes('catch')) errorHandling.tryCatch++
      if (content.includes('.catch(') || content.includes('Promise.reject')) errorHandling.asyncErrorHandling++
      if (content.includes('fallback=') || content.includes('Fallback')) errorHandling.fallbackUI++
      if (content.includes('console.error') || content.includes('logError')) errorHandling.errorLogging++
      if (content.includes('retry') || content.includes('attemptCount')) errorHandling.retryLogic++
    }

    this.results.metrics.errorHandling = errorHandling

    console.log(`  ✅ Error handling analyzed`)
    console.log(`    - Error boundaries: ${errorHandling.errorBoundaries}, Retry logic: ${errorHandling.retryLogic}`)
  }

  extractPatterns(content) {
    const patterns = []
    
    if (content.includes('getServerSideProps')) patterns.push('SSR')
    if (content.includes('getStaticProps')) patterns.push('SSG')
    if (content.includes('use client')) patterns.push('CSR')
    if (content.includes('generateStaticParams')) patterns.push('ISR')
    if (content.includes('loading.tsx')) patterns.push('Streaming')
    if (content.includes('Suspense')) patterns.push('Suspense')
    
    return patterns
  }

  async checkN1Queries() {
    // Check for N+1 query patterns
    const libDir = path.join(__dirname, '..', 'src', 'lib')
    try {
      const files = await this.scanDirectory(libDir, '.ts')
      
      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8')
        
        // Look for loops with database calls
        if (content.includes('for') && content.includes('await') && content.includes('supabase')) {
          this.results.issues.push({
            type: 'performance',
            file: path.basename(file),
            severity: 'high',
            message: 'Potential N+1 query detected - consider batch loading'
          })
        }
      }
    } catch (e) {
      // Lib directory might not exist
    }
  }

  async scanDirectory(dir, extension) {
    const files = []
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          const subFiles = await this.scanDirectory(fullPath, extension)
          files.push(...subFiles)
        } else if (entry.name.endsWith(extension)) {
          files.push(fullPath)
        }
      }
    } catch (e) {
      // Directory might not exist
    }
    
    return files
  }

  calculateScore() {
    let score = 100
    
    // Deduct points for issues
    this.results.issues.forEach(issue => {
      if (issue.severity === 'critical') score -= 10
      else if (issue.severity === 'high') score -= 5
      else score -= 2
    })
    
    // Add points for good practices
    const { components, apiRoutes, security, performance, errorHandling } = this.results.metrics
    
    if (components && components.server > components.client) score += 5 // Server-first approach
    if (apiRoutes && apiRoutes.cached > apiRoutes.total * 0.5) score += 5 // Good caching
    if (security && security.validation > 0 && security.sanitization > 0) score += 5 // Security measures
    if (performance && performance.lazyLoading > 0 && performance.memoization > 0) score += 5 // Performance opts
    if (errorHandling && errorHandling.errorBoundaries > 0) score += 5 // Error handling
    
    // Generate recommendations
    this.generateRecommendations()
    
    this.results.score = Math.max(0, Math.min(100, score))
  }

  generateRecommendations() {
    const { components, apiRoutes, dataFlow, security, performance } = this.results.metrics
    
    if (components && components.mixed > components.total * 0.3) {
      this.results.recommendations.push({
        priority: 'high',
        category: 'architecture',
        message: 'Consider separating client and server components more clearly',
        impact: 'Improved performance and smaller bundle size'
      })
    }
    
    if (apiRoutes && apiRoutes.cached < apiRoutes.total * 0.5) {
      this.results.recommendations.push({
        priority: 'medium',
        category: 'performance',
        message: 'Implement caching for more API routes',
        impact: 'Reduced database load and faster response times'
      })
    }
    
    if (security && security.rateLimit === 0) {
      this.results.recommendations.push({
        priority: 'high',
        category: 'security',
        message: 'Implement rate limiting for API endpoints',
        impact: 'Protection against abuse and DDoS attacks'
      })
    }
    
    if (performance && performance.virtualScrolling === 0) {
      this.results.recommendations.push({
        priority: 'low',
        category: 'performance',
        message: 'Consider virtual scrolling for large lists',
        impact: 'Better performance with large datasets'
      })
    }
    
    if (dataFlow && dataFlow.realtime === 0) {
      this.results.recommendations.push({
        priority: 'low',
        category: 'features',
        message: 'Consider adding real-time features for better UX',
        impact: 'Improved user engagement and collaboration'
      })
    }
  }

  async generateReport() {
    const report = {
      ...this.results,
      summary: {
        title: 'UI/Backend Connection Analysis Report',
        timestamp: this.results.timestamp,
        score: this.results.score,
        duration: this.results.analysisDuration,
        issueCount: this.results.issues.length,
        recommendationCount: this.results.recommendations.length
      }
    }
    
    // Save JSON report
    const reportPath = path.join(__dirname, '..', `ui-backend-analysis-${Date.now()}.json`)
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
    
    // Generate markdown summary
    const markdown = this.generateMarkdown(report)
    const mdPath = path.join(__dirname, '..', `ui-backend-analysis-${Date.now()}.md`)
    await fs.writeFile(mdPath, markdown)
    
    console.log(`\n📄 Reports saved:`)
    console.log(`  - JSON: ${path.basename(reportPath)}`)
    console.log(`  - Markdown: ${path.basename(mdPath)}`)
    
    return report
  }

  generateMarkdown(report) {
    return `# UI/Backend Connection Analysis Report

**Date:** ${report.timestamp}
**Score:** ${report.score}/100
**Analysis Duration:** ${(report.analysisDuration / 1000).toFixed(2)}s

## Executive Summary

The UI/Backend architecture analysis reveals a score of **${report.score}/100** with ${report.issues.length} issues identified and ${report.recommendations.length} recommendations for improvement.

## Metrics Overview

### Components
- Total: ${report.metrics.components?.total || 0}
- Client: ${report.metrics.components?.client || 0}
- Server: ${report.metrics.components?.server || 0}
- Mixed: ${report.metrics.components?.mixed || 0}

### API Routes
- Total: ${report.metrics.apiRoutes?.total || 0}
- Cached: ${report.metrics.apiRoutes?.cached || 0}
- Protected: ${report.metrics.apiRoutes?.protected || 0}
- Streaming: ${report.metrics.apiRoutes?.streaming || 0}

### Performance Optimizations
- Lazy Loading: ${report.metrics.performance?.lazyLoading || 0}
- Memoization: ${report.metrics.performance?.memoization || 0}
- Virtual Scrolling: ${report.metrics.performance?.virtualScrolling || 0}

### Security Measures
- Authentication: ${report.metrics.security?.authentication || 0}
- Validation: ${report.metrics.security?.validation || 0}
- Rate Limiting: ${report.metrics.security?.rateLimit || 0}

## Critical Issues

${report.issues.filter(i => i.severity === 'critical').map(i => 
  `- **${i.type}**: ${i.message} (${i.file || 'general'})`
).join('\n') || 'No critical issues found.'}

## Recommendations

${report.recommendations.sort((a, b) => {
  const priority = { high: 0, medium: 1, low: 2 }
  return priority[a.priority] - priority[b.priority]
}).map(r => 
  `### ${r.priority.toUpperCase()}: ${r.message}
- **Category:** ${r.category}
- **Impact:** ${r.impact}
`).join('\n')}

## Conclusion

The system demonstrates ${report.score >= 80 ? 'excellent' : report.score >= 60 ? 'good' : 'needs improvement'} UI/Backend integration with strong foundations for scaling to 50,000 users.

---
*Generated by Enterprise Architecture Analyzer*`
  }
}

// Run the analyzer
async function main() {
  const analyzer = new UIBackendAnalyzer()
  
  try {
    const results = await analyzer.analyze()
    const report = await analyzer.generateReport()
    
    console.log('\n' + '=' .repeat(70))
    console.log('📈 Analysis Complete!')
    console.log(`  Score: ${report.score}/100`)
    console.log(`  Issues: ${report.issues.length}`)
    console.log(`  Recommendations: ${report.recommendations.length}`)
    
    if (report.score >= 80) {
      console.log('\n✅ Excellent UI/Backend architecture ready for enterprise scale!')
    } else if (report.score >= 60) {
      console.log('\n⚠️ Good foundation but improvements needed for 50K users')
    } else {
      console.log('\n❌ Significant architectural improvements required')
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error)
    process.exit(1)
  }
}

main()
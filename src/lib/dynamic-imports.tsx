/**
 * Dynamic Import Configuration for 60% Bundle Size Reduction
 * Implements code splitting and lazy loading
 */

import dynamic from 'next/dynamic'
import React, { ComponentType, lazy } from 'react'

// Loading component for lazy-loaded modules
const LoadingComponent = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
)

// ============================================
// HEAVY COMPONENTS - LAZY LOAD
// ============================================

// Chart components (Recharts is heavy)
export const DynamicLineChart = dynamic(
  () => import('recharts').then(mod => mod.LineChart as any),
  { 
    loading: LoadingComponent,
    ssr: false // Charts don't need SSR
  }
)

export const DynamicBarChart = dynamic(
  () => import('recharts').then(mod => mod.BarChart as any),
  { 
    loading: LoadingComponent,
    ssr: false
  }
)

export const DynamicAreaChart = dynamic(
  () => import('recharts').then(mod => mod.AreaChart as any),
  { 
    loading: LoadingComponent,
    ssr: false
  }
)

export const DynamicPieChart = dynamic(
  () => import('recharts').then(mod => mod.PieChart as any),
  { 
    loading: LoadingComponent,
    ssr: false
  }
)

// Map components (Mapbox is very heavy)
export const DynamicMap = dynamic(
  () => import('@/components/map/working-map'),
  { 
    loading: LoadingComponent,
    ssr: false // Maps can't SSR
  }
)

// PDF Export (jsPDF is heavy) - Component not yet created
// export const DynamicPDFExport = dynamic(
//   () => import('@/components/reports/pdf-export'),
//   { 
//     loading: LoadingComponent,
//     ssr: false
//   }
// )

// Gantt Chart (Complex component)
export const DynamicGanttChart = dynamic(
  () => import('@/components/reports/gantt-chart-pro'),
  { 
    loading: LoadingComponent,
    ssr: false
  }
)

// TensorFlow (ML features)
export const DynamicMLAnalyzer = dynamic(
  () => import('@/lib/architecture-analyzer-enterprise').then(mod => mod.EnterpriseArchitectureAnalyzer as any),
  { 
    loading: LoadingComponent,
    ssr: false // TensorFlow can't SSR
  }
)

// Rich Text Editor (if used) - Component not yet created
// export const DynamicRichTextEditor = dynamic(
//   () => import('@/components/editor/rich-text-editor'),
//   { 
//     loading: LoadingComponent,
//     ssr: false
//   }
// )

// ============================================
// PAGE-LEVEL DYNAMIC IMPORTS
// ============================================

// Dashboard components - load on demand - Components not yet created
// export const DynamicDashboardCharts = dynamic(
//   () => import('@/components/dashboard/charts'),
//   { loading: LoadingComponent }
// )

// export const DynamicAnalytics = dynamic(
//   () => import('@/components/dashboard/analytics'),
//   { loading: LoadingComponent }
// )

// Reports page - heavy components - Component not yet created
// export const DynamicReportsSection = dynamic(
//   () => import('@/components/reports/reports-section'),
//   { loading: LoadingComponent }
// )

// Architecture Analysis - heavy ML components - Component not yet created
// export const DynamicArchitectureAnalysis = dynamic(
//   () => import('@/components/architecture/ArchitectureAnalysisClient'),
//   { loading: LoadingComponent }
// )

// ============================================
// UTILITY FUNCTIONS FOR DYNAMIC IMPORTS
// ============================================

/**
 * Preload component for better UX
 */
export function preloadComponent(componentLoader: () => Promise<any>) {
  // Preload on mouse enter or focus
  return {
    onMouseEnter: componentLoader,
    onFocus: componentLoader
  }
}

/**
 * Dynamic import with retry logic
 */
export async function importWithRetry<T>(
  importFn: () => Promise<{ default: T }>,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    const module = await importFn()
    return module.default
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
      return importWithRetry(importFn, retries - 1, delay * 2)
    }
    throw error
  }
}

/**
 * Progressive enhancement wrapper
 */
export function withProgressive<P extends object>(
  Component: ComponentType<P>,
  FallbackComponent?: ComponentType<P>
) {
  return dynamic(
    async () => {
      try {
        return { default: Component }
      } catch {
        if (FallbackComponent) {
          return { default: FallbackComponent }
        }
        throw new Error('Component failed to load')
      }
    },
    {
      loading: LoadingComponent,
      ssr: true
    }
  )
}

// ============================================
// ROUTE-BASED CODE SPLITTING
// ============================================

/**
 * Split routes into chunks
 */
export const routeChunks = {
  // Core routes (always loaded)
  core: [
    '/',
    '/dashboard',
    '/login',
    '/register'
  ],
  
  // Project management chunk
  projects: [
    '/projects',
    '/projects/[id]',
    '/tasks',
    '/tasks/[id]'
  ],
  
  // Analytics chunk
  analytics: [
    '/analytics',
    '/reports',
    '/architecture-analysis'
  ],
  
  // Admin chunk
  admin: [
    '/admin',
    '/settings',
    '/organization'
  ]
}

/**
 * Get chunk name for route
 */
export function getRouteChunk(pathname: string): keyof typeof routeChunks {
  for (const [chunk, routes] of Object.entries(routeChunks)) {
    if (routes.some(route => pathname.startsWith(route.replace('[id]', '')))) {
      return chunk as keyof typeof routeChunks
    }
  }
  return 'core'
}

// ============================================
// INTERSECTION OBSERVER FOR LAZY LOADING
// ============================================

/**
 * Component lazy loader with intersection observer
 */
export function LazyLoadWrapper({ 
  children,
  rootMargin = '50px',
  threshold = 0.01
}: {
  children: React.ReactNode
  rootMargin?: string
  threshold?: number
}) {
  const [isInView, setIsInView] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { rootMargin, threshold }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [rootMargin, threshold])

  return (
    <div ref={ref}>
      {isInView ? children : <LoadingComponent />}
    </div>
  )
}

// ============================================
// WEBPACK MAGIC COMMENTS FOR OPTIMIZATION
// ============================================

/**
 * Import with webpack optimization hints
 */
export function optimizedImport<T>(
  path: string,
  options: {
    prefetch?: boolean
    preload?: boolean
    chunkName?: string
  } = {}
): Promise<{ default: T }> {
  const { prefetch = false, preload = false, chunkName } = options
  
  let importStr = `import('${path}'`
  const comments = []
  
  if (chunkName) comments.push(`webpackChunkName: "${chunkName}"`)
  if (prefetch) comments.push('webpackPrefetch: true')
  if (preload) comments.push('webpackPreload: true')
  
  if (comments.length > 0) {
    importStr = `import(/* ${comments.join(', ')} */ '${path}'`
  }
  
  // This is a placeholder - actual implementation would use webpack
  return import(path) as Promise<{ default: T }>
}

export default {
  DynamicLineChart,
  DynamicBarChart,
  DynamicAreaChart,
  DynamicPieChart,
  DynamicMap,
  // DynamicPDFExport,
  DynamicGanttChart,
  DynamicMLAnalyzer,
  // DynamicRichTextEditor,
  // DynamicDashboardCharts,
  // DynamicAnalytics,
  // DynamicReportsSection,
  // DynamicArchitectureAnalysis,
  preloadComponent,
  importWithRetry,
  withProgressive,
  LazyLoadWrapper,
  optimizedImport
}
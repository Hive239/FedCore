/**
 * Server Component for Architecture Analysis Data Fetching
 * Improves SSR performance by fetching data at build time
 */

import { createClient } from '@/lib/supabase/server'
import { Suspense, cache } from 'react'
import { ArchitectureAnalysisClient } from './ArchitectureAnalysisClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { systemCache } from '@/lib/cache/enhanced-cache'

interface SystemData {
  profiles: any[]
  projects: any[]
  tasks: any[]
  reports: any[]
  vulnerabilities: any[]
  performanceLogs: any[]
  errorLogs: any[]
  organizations: any[]
  activityLogs: any[]
}

// Cached data fetcher with React cache and custom caching
const fetchSystemData = cache(async (): Promise<SystemData> => {
  const cacheKey = 'system-data'
  
  // Try custom cache first (for cross-request caching)
  const cached = await systemCache.get(cacheKey)
  if (cached) {
    return cached as SystemData
  }

  const supabase = await createClient()
  
  try {
    // Fetch all data in parallel for better performance
    const [
      profilesResult,
      projectsResult,
      tasksResult,
      reportsResult,
      vulnerabilitiesResult,
      performanceResult,
      errorsResult,
      orgsResult,
      activityResult
    ] = await Promise.all([
      supabase.from('profiles').select('id, name, email, role, created_at, updated_at').limit(100),
      supabase.from('projects').select('id, name, status, budget, progress, created_at, updated_at').limit(100),
      supabase.from('tasks').select('id, title, status, priority, project_id, assigned_to, created_at, updated_at').limit(500),
      supabase.from('architecture_reports').select('*').limit(50),
      supabase.from('security_vulnerabilities').select('*').limit(100),
      supabase.from('performance_logs').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('error_logs').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('organizations').select('*').limit(50),
      supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(200)
    ])

    const systemData = {
      profiles: profilesResult.data || [],
      projects: projectsResult.data || [],
      tasks: tasksResult.data || [],
      reports: reportsResult.data || [],
      vulnerabilities: vulnerabilitiesResult.data || [],
      performanceLogs: performanceResult.data || [],
      errorLogs: errorsResult.data || [],
      organizations: orgsResult.data || [],
      activityLogs: activityResult.data || []
    }

    // Store in custom cache for 15 minutes
    await systemCache.set(cacheKey, systemData, 15 * 60 * 1000)

    return systemData
  } catch (error) {
    console.error('Error fetching system data:', error)
    // Return empty data structure to prevent crashes
    return {
      profiles: [],
      projects: [],
      tasks: [],
      reports: [],
      vulnerabilities: [],
      performanceLogs: [],
      errorLogs: [],
      organizations: [],
      activityLogs: []
    }
  }
})

function DataLoadingSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

async function ArchitectureDataServer() {
  const systemData = await fetchSystemData()
  return <ArchitectureAnalysisClient initialData={systemData} />
}

export default function ServerDataFetcher() {
  return (
    <Suspense fallback={<DataLoadingSkeleton />}>
      <ArchitectureDataServer />
    </Suspense>
  )
}

// Cache this component for better performance
export const revalidate = 300 // Revalidate every 5 minutes
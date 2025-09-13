'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState, ReactNode } from 'react'
import { toast } from '@/hooks/use-toast'

// Optimized query client configuration for performance
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is considered fresh for 5 minutes
        staleTime: 5 * 60 * 1000,
        // Keep cache for 10 minutes
        gcTime: 10 * 60 * 1000,
        // Don't refetch on window focus for better performance
        refetchOnWindowFocus: false,
        // Always refetch on reconnect
        refetchOnReconnect: 'always',
        // Retry failed requests 2 times
        retry: 2,
        // Exponential backoff for retries
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // Enable smart refetching
        refetchInterval: false,
        // Structural sharing for better performance
        structuralSharing: true,
      },
      mutations: {
        // Only retry mutations once
        retry: 1,
        // Show error toast on failure
        onError: (error: any) => {
          toast({
            variant: 'destructive',
            title: 'Operation failed',
            description: error?.message || 'Something went wrong. Please try again.',
          })
        },
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined = undefined

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient()
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) browserQueryClient = makeQueryClient()
    return browserQueryClient
  }
}

// Prefetch utilities for predictive loading
export async function prefetchDashboardData(queryClient: QueryClient, tenantId: string) {
  // Prefetch common dashboard queries
  const prefetchPromises = [
    queryClient.prefetchQuery({
      queryKey: ['projects', tenantId],
      queryFn: () => fetch(`/api/projects?tenantId=${tenantId}`).then(res => res.json()),
      staleTime: 10 * 60 * 1000, // Consider fresh for 10 minutes
    }),
    queryClient.prefetchQuery({
      queryKey: ['tasks', tenantId, 'recent'],
      queryFn: () => fetch(`/api/tasks?tenantId=${tenantId}&recent=true`).then(res => res.json()),
      staleTime: 5 * 60 * 1000,
    }),
    queryClient.prefetchQuery({
      queryKey: ['dashboard-stats', tenantId],
      queryFn: () => fetch(`/api/dashboard/stats?tenantId=${tenantId}`).then(res => res.json()),
      staleTime: 5 * 60 * 1000,
    }),
  ]

  await Promise.all(prefetchPromises)
}

// Optimized provider with performance features
export function OptimizedQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => getQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools 
          initialIsOpen={false} 
        />
      )}
    </QueryClientProvider>
  )
}

// Export optimized query client for direct usage
export const optimizedQueryClient = getQueryClient()

// Utility hooks for common patterns
export function useOptimisticUpdate<T>(
  queryKey: any[],
  mutationFn: (data: T) => Promise<T>,
  options?: {
    onSuccess?: (data: T) => void
    onError?: (error: any) => void
  }
) {
  const queryClient = getQueryClient()
  
  return {
    mutate: async (data: T) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey })
      
      // Snapshot the previous value
      const previousData = queryClient.getQueryData(queryKey)
      
      // Optimistically update
      queryClient.setQueryData(queryKey, (old: any) => ({
        ...old,
        ...data,
      }))
      
      try {
        const result = await mutationFn(data)
        options?.onSuccess?.(result)
        return result
      } catch (error) {
        // Revert on error
        queryClient.setQueryData(queryKey, previousData)
        options?.onError?.(error)
        throw error
      }
    }
  }
}

// Infinite query optimization for large lists
export const infiniteQueryOptions = {
  getNextPageParam: (lastPage: any) => lastPage.nextCursor,
  getPreviousPageParam: (firstPage: any) => firstPage.prevCursor,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  staleTime: 5 * 60 * 1000,
}

// Background refetch for critical data
export function useBackgroundRefetch(queryKey: any[], interval: number = 30000) {
  const queryClient = getQueryClient()
  
  if (typeof window !== 'undefined') {
    setInterval(() => {
      if (document.visibilityState === 'visible') {
        queryClient.invalidateQueries({ queryKey })
      }
    }, interval)
  }
}
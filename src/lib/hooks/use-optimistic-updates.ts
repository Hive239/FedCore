import { useState, useCallback, useRef, useEffect } from 'react'
import { useQueryClient, useMutation, QueryKey } from '@tanstack/react-query'
import { toast } from '@/hooks/use-toast'

export interface OptimisticUpdate<TData, TVariables> {
  id: string
  queryKey: QueryKey
  optimisticData: TData
  originalData?: TData
  variables: TVariables
  timestamp: number
}

/**
 * Hook for managing optimistic updates with automatic rollback on error
 */
export function useOptimisticUpdates<TData = any, TVariables = any>() {
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, OptimisticUpdate<TData, TVariables>>>(new Map())
  const queryClient = useQueryClient()
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map())
  
  // Create optimistic update
  const createOptimisticUpdate = useCallback((
    queryKey: QueryKey,
    variables: TVariables,
    updateFn: (oldData: TData | undefined) => TData,
    options?: {
      timeout?: number
      onSuccess?: (data: TData) => void
      onError?: (error: Error) => void
      showToast?: boolean
    }
  ) => {
    const updateId = `${Date.now()}-${Math.random()}`
    const originalData = queryClient.getQueryData<TData>(queryKey)
    const optimisticData = updateFn(originalData)
    
    // Apply optimistic update
    queryClient.setQueryData(queryKey, optimisticData)
    
    // Store update for potential rollback
    const update: OptimisticUpdate<TData, TVariables> = {
      id: updateId,
      queryKey,
      optimisticData,
      originalData,
      variables,
      timestamp: Date.now()
    }
    
    setPendingUpdates(prev => new Map(prev).set(updateId, update))
    
    // Set timeout for automatic rollback if not confirmed
    if (options?.timeout) {
      const timeoutId = setTimeout(() => {
        rollbackUpdate(updateId, 'Timeout: Operation took too long')
      }, options.timeout)
      
      timeoutRefs.current.set(updateId, timeoutId)
    }
    
    if (options?.showToast) {
      toast({
        title: 'Updating...',
        description: 'Changes are being saved'
      })
    }
    
    return updateId
  }, [queryClient])
  
  // Confirm optimistic update (remove from pending)
  const confirmUpdate = useCallback((updateId: string) => {
    setPendingUpdates(prev => {
      const newMap = new Map(prev)
      newMap.delete(updateId)
      return newMap
    })
    
    // Clear timeout
    const timeoutId = timeoutRefs.current.get(updateId)
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutRefs.current.delete(updateId)
    }
  }, [])
  
  // Rollback optimistic update
  const rollbackUpdate = useCallback((updateId: string, reason?: string) => {
    const update = pendingUpdates.get(updateId)
    if (!update) return
    
    // Restore original data
    queryClient.setQueryData(update.queryKey, update.originalData)
    
    // Remove from pending
    setPendingUpdates(prev => {
      const newMap = new Map(prev)
      newMap.delete(updateId)
      return newMap
    })
    
    // Clear timeout
    const timeoutId = timeoutRefs.current.get(updateId)
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutRefs.current.delete(updateId)
    }
    
    if (reason) {
      toast({
        title: 'Update failed',
        description: reason,
        variant: 'destructive'
      })
    }
  }, [pendingUpdates, queryClient])
  
  // Rollback all pending updates
  const rollbackAllUpdates = useCallback(() => {
    pendingUpdates.forEach((update, updateId) => {
      queryClient.setQueryData(update.queryKey, update.originalData)
    })
    
    setPendingUpdates(new Map())
    
    // Clear all timeouts
    timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId))
    timeoutRefs.current.clear()
  }, [pendingUpdates, queryClient])
  
  // Get pending updates for a specific query
  const getPendingUpdates = useCallback((queryKey: QueryKey) => {
    return Array.from(pendingUpdates.values()).filter(update => 
      JSON.stringify(update.queryKey) === JSON.stringify(queryKey)
    )
  }, [pendingUpdates])
  
  // Check if a query has pending updates
  const hasPendingUpdates = useCallback((queryKey: QueryKey) => {
    return getPendingUpdates(queryKey).length > 0
  }, [getPendingUpdates])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId))
      timeoutRefs.current.clear()
    }
  }, [])
  
  return {
    createOptimisticUpdate,
    confirmUpdate,
    rollbackUpdate,
    rollbackAllUpdates,
    getPendingUpdates,
    hasPendingUpdates,
    pendingUpdatesCount: pendingUpdates.size
  }
}

/**
 * Enhanced mutation hook with optimistic updates
 */
export function useOptimisticMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown
>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    queryKey?: QueryKey
    optimisticUpdateFn?: (variables: TVariables) => (oldData: any) => any
    onSuccess?: (data: TData, variables: TVariables, context: TContext) => void
    onError?: (error: TError, variables: TVariables, context: TContext) => void
    timeout?: number
    showToast?: boolean
  }
) {
  const { createOptimisticUpdate, confirmUpdate, rollbackUpdate } = useOptimisticUpdates()
  
  return useMutation({
    mutationFn,
    onMutate: async (variables: TVariables) => {
      let updateId: string | undefined
      
      if (options?.queryKey && options?.optimisticUpdateFn) {
        updateId = createOptimisticUpdate(
          options.queryKey,
          variables,
          options.optimisticUpdateFn(variables),
          {
            timeout: options.timeout,
            showToast: options.showToast
          }
        )
      }
      
      return { updateId, variables }
    },
    onSuccess: (data, variables, context: any) => {
      if (context?.updateId) {
        confirmUpdate(context.updateId)
      }
      
      if (options?.showToast) {
        toast({
          title: 'Success',
          description: 'Changes saved successfully'
        })
      }
      
      options?.onSuccess?.(data, variables, context)
    },
    onError: (error, variables, context: any) => {
      if (context?.updateId) {
        rollbackUpdate(context.updateId, error.message)
      }
      
      options?.onError?.(error as TError, variables, context)
    }
  })
}

/**
 * Hook for intelligent data prefetching
 */
export function usePrefetch() {
  const queryClient = useQueryClient()
  const prefetchTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map())
  
  // Prefetch data with debouncing
  const prefetchQuery = useCallback((
    queryKey: QueryKey,
    queryFn: () => Promise<any>,
    options?: {
      delay?: number
      staleTime?: number
      force?: boolean
    }
  ) => {
    const keyString = JSON.stringify(queryKey)
    const delay = options?.delay || 500
    
    // Clear existing timeout for this query
    const existingTimeout = prefetchTimeouts.current.get(keyString)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }
    
    // Set new timeout
    const timeoutId = setTimeout(async () => {
      try {
        // Check if data is already fresh
        if (!options?.force) {
          const queryState = queryClient.getQueryState(queryKey)
          const staleTime = options?.staleTime || 5 * 60 * 1000 // 5 minutes default
          
          if (queryState && queryState.dataUpdatedAt > Date.now() - staleTime) {
            return // Data is still fresh, skip prefetch
          }
        }
        
        await queryClient.prefetchQuery({
          queryKey,
          queryFn,
          staleTime: options?.staleTime || 5 * 60 * 1000
        })
      } catch (error) {
        console.warn('Prefetch failed for', queryKey, error)
      } finally {
        prefetchTimeouts.current.delete(keyString)
      }
    }, delay)
    
    prefetchTimeouts.current.set(keyString, timeoutId)
  }, [queryClient])
  
  // Cancel prefetch
  const cancelPrefetch = useCallback((queryKey: QueryKey) => {
    const keyString = JSON.stringify(queryKey)
    const timeout = prefetchTimeouts.current.get(keyString)
    if (timeout) {
      clearTimeout(timeout)
      prefetchTimeouts.current.delete(keyString)
    }
  }, [])
  
  // Prefetch related data based on user interaction patterns
  const prefetchRelated = useCallback((
    baseQueryKey: QueryKey,
    relatedQueries: Array<{
      queryKey: QueryKey
      queryFn: () => Promise<any>
      probability?: number // 0-1, how likely this query is needed
    }>,
    options?: {
      delay?: number
      maxConcurrent?: number
    }
  ) => {
    const delay = options?.delay || 1000
    const maxConcurrent = options?.maxConcurrent || 3
    
    // Sort by probability and take top N
    const sortedQueries = relatedQueries
      .sort((a, b) => (b.probability || 0.5) - (a.probability || 0.5))
      .slice(0, maxConcurrent)
    
    // Prefetch with staggered delays
    sortedQueries.forEach((query, index) => {
      prefetchQuery(
        query.queryKey,
        query.queryFn,
        {
          delay: delay + (index * 200), // Stagger by 200ms
          staleTime: 10 * 60 * 1000 // 10 minutes for related data
        }
      )
    })
  }, [prefetchQuery])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      prefetchTimeouts.current.forEach(timeout => clearTimeout(timeout))
      prefetchTimeouts.current.clear()
    }
  }, [])
  
  return {
    prefetchQuery,
    cancelPrefetch,
    prefetchRelated
  }
}

/**
 * Hook for background synchronization
 */
export function useBackgroundSync() {
  const queryClient = useQueryClient()
  const [isSyncing, setIsSyncing] = useState(false)
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Start background sync
  const startSync = useCallback((options?: {
    interval?: number
    queries?: QueryKey[]
    onlyWhenVisible?: boolean
  }) => {
    const interval = options?.interval || 30000 // 30 seconds default
    const queries = options?.queries || []
    const onlyWhenVisible = options?.onlyWhenVisible !== false
    
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current)
    }
    
    syncIntervalRef.current = setInterval(async () => {
      // Skip if page is not visible
      if (onlyWhenVisible && document.visibilityState !== 'visible') {
        return
      }
      
      try {
        setIsSyncing(true)
        
        if (queries.length > 0) {
          // Sync specific queries
          await Promise.all(
            queries.map(queryKey => 
              queryClient.invalidateQueries({ queryKey })
            )
          )
        } else {
          // Sync all stale queries
          await queryClient.invalidateQueries({ stale: true })
        }
      } catch (error) {
        console.error('Background sync failed:', error)
      } finally {
        setIsSyncing(false)
      }
    }, interval)
  }, [queryClient])
  
  // Stop background sync
  const stopSync = useCallback(() => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current)
      syncIntervalRef.current = null
    }
    setIsSyncing(false)
  }, [])
  
  // Manual sync
  const syncNow = useCallback(async (queries?: QueryKey[]) => {
    try {
      setIsSyncing(true)
      
      if (queries && queries.length > 0) {
        await Promise.all(
          queries.map(queryKey => 
            queryClient.invalidateQueries({ queryKey })
          )
        )
      } else {
        await queryClient.invalidateQueries({ stale: true })
      }
      
      toast({
        title: 'Synchronized',
        description: 'Data has been refreshed'
      })
    } catch (error) {
      toast({
        title: 'Sync failed',
        description: 'Unable to refresh data',
        variant: 'destructive'
      })
    } finally {
      setIsSyncing(false)
    }
  }, [queryClient])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
      }
    }
  }, [])
  
  return {
    startSync,
    stopSync,
    syncNow,
    isSyncing
  }
}
import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Hook for debounced search functionality
 * Delays search execution until user stops typing
 */
export function useDebouncedSearch<T = any>(
  searchFunction: (query: string, filters?: any) => Promise<T>,
  delay: number = 300
) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [filters, setFilters] = useState<any>({})
  
  const abortControllerRef = useRef<AbortController | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Debounce the search query
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = setTimeout(() => {
      setDebouncedQuery(query)
    }, delay)
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [query, delay])
  
  // Execute search when debounced query changes
  useEffect(() => {
    const executeSearch = async () => {
      if (!debouncedQuery.trim() && !Object.keys(filters).length) {
        setResults(null)
        setError(null)
        return
      }
      
      // Cancel previous search
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      // Create new abort controller for this search
      abortControllerRef.current = new AbortController()
      
      try {
        setIsSearching(true)
        setError(null)
        
        const searchResults = await searchFunction(debouncedQuery, filters)
        
        // Only update results if search wasn't aborted
        if (!abortControllerRef.current.signal.aborted) {
          setResults(searchResults)
        }
      } catch (err) {
        if (!abortControllerRef.current.signal.aborted) {
          setError(err as Error)
          setResults(null)
        }
      } finally {
        if (!abortControllerRef.current.signal.aborted) {
          setIsSearching(false)
        }
      }
    }
    
    executeSearch()
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [debouncedQuery, filters, searchFunction])
  
  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('')
    setDebouncedQuery('')
    setResults(null)
    setError(null)
    setIsSearching(false)
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])
  
  // Update filters
  const updateFilters = useCallback((newFilters: any) => {
    setFilters(newFilters)
  }, [])
  
  // Immediate search (skip debounce)
  const searchImmediate = useCallback(async (immediateQuery?: string) => {
    const queryToUse = immediateQuery ?? query
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    abortControllerRef.current = new AbortController()
    
    try {
      setIsSearching(true)
      setError(null)
      
      const searchResults = await searchFunction(queryToUse, filters)
      
      if (!abortControllerRef.current.signal.aborted) {
        setResults(searchResults)
        setDebouncedQuery(queryToUse)
      }
    } catch (err) {
      if (!abortControllerRef.current.signal.aborted) {
        setError(err as Error)
        setResults(null)
      }
    } finally {
      if (!abortControllerRef.current.signal.aborted) {
        setIsSearching(false)
      }
    }
  }, [query, filters, searchFunction])
  
  return {
    query,
    setQuery,
    debouncedQuery,
    isSearching,
    results,
    error,
    filters,
    updateFilters,
    clearSearch,
    searchImmediate,
    hasQuery: debouncedQuery.trim().length > 0
  }
}

/**
 * Hook for debounced value updates
 * Generic hook for debouncing any value changes
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])
  
  return debouncedValue
}

/**
 * Hook for debounced callback execution
 * Delays callback execution until user stops triggering it
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): [T, () => void] {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const callbackRef = useRef(callback)
  
  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])
  
  const debouncedCallback = useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args)
      }, delay)
    }) as T,
    [delay]
  )
  
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])
  
  return [debouncedCallback, cancel]
}
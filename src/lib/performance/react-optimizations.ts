import React, { ComponentType, memo, useMemo, useCallback, useRef, useEffect, useState } from 'react'

// Generic memo comparison helpers for complex props
export const deepEqual = (prevProps: any, nextProps: any): boolean => {
  if (prevProps === nextProps) return true
  if (!prevProps || !nextProps) return false
  if (typeof prevProps !== 'object' || typeof nextProps !== 'object') return false

  const prevKeys = Object.keys(prevProps)
  const nextKeys = Object.keys(nextProps)
  
  if (prevKeys.length !== nextKeys.length) return false
  
  for (const key of prevKeys) {
    if (!nextKeys.includes(key)) return false
    
    const prevValue = prevProps[key]
    const nextValue = nextProps[key]
    
    // Handle arrays
    if (Array.isArray(prevValue) && Array.isArray(nextValue)) {
      if (prevValue.length !== nextValue.length) return false
      for (let i = 0; i < prevValue.length; i++) {
        if (!deepEqual(prevValue[i], nextValue[i])) return false
      }
      continue
    }
    
    // Handle objects
    if (typeof prevValue === 'object' && typeof nextValue === 'object') {
      if (!deepEqual(prevValue, nextValue)) return false
      continue
    }
    
    // Handle primitives
    if (prevValue !== nextValue) return false
  }
  
  return true
}

// Shallow comparison for objects with specific keys to ignore
export const shallowEqualIgnoreKeys = (keysToIgnore: string[] = []) => 
  (prevProps: any, nextProps: any): boolean => {
    if (prevProps === nextProps) return true
    if (!prevProps || !nextProps) return false
    
    const prevKeys = Object.keys(prevProps).filter(key => !keysToIgnore.includes(key))
    const nextKeys = Object.keys(nextProps).filter(key => !keysToIgnore.includes(key))
    
    if (prevKeys.length !== nextKeys.length) return false
    
    return prevKeys.every(key => prevProps[key] === nextProps[key])
  }

// Array comparison helper
export const arrayShallowEqual = (prevArray: readonly any[], nextArray: readonly any[]): boolean => {
  if (prevArray === nextArray) return true
  if (!prevArray || !nextArray) return false
  if (prevArray.length !== nextArray.length) return false
  
  return prevArray.every((item, index) => item === nextArray[index])
}

// Props comparison for array-heavy components
export const arrayPropsEqual = (arrayKeys: string[] = []) => 
  (prevProps: any, nextProps: any): boolean => {
    if (prevProps === nextProps) return true
    if (!prevProps || !nextProps) return false
    
    const allKeys = new Set([...Object.keys(prevProps), ...Object.keys(nextProps)])
    
    for (const key of allKeys) {
      const prevValue = prevProps[key]
      const nextValue = nextProps[key]
      
      if (arrayKeys.includes(key)) {
        if (!Array.isArray(prevValue) || !Array.isArray(nextValue)) {
          if (prevValue !== nextValue) return false
        } else if (!arrayShallowEqual(prevValue, nextValue)) {
          return false
        }
      } else {
        if (prevValue !== nextValue) return false
      }
    }
    
    return true
  }

// Performance monitoring HOC
interface PerformanceMetrics {
  renderCount: number
  lastRenderTime: number
  avgRenderTime: number
  maxRenderTime: number
  minRenderTime: number
}

export function withPerformanceMonitoring<P extends object>(
  Component: ComponentType<P>,
  componentName: string = Component.displayName || Component.name || 'Unknown'
) {
  const PerformanceMonitoredComponent = (props: P) => {
    const metricsRef = useRef<PerformanceMetrics>({
      renderCount: 0,
      lastRenderTime: 0,
      avgRenderTime: 0,
      maxRenderTime: 0,
      minRenderTime: Infinity
    })
    
    const startTime = performance.now()
    
    useEffect(() => {
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      const metrics = metricsRef.current
      metrics.renderCount++
      metrics.lastRenderTime = renderTime
      metrics.maxRenderTime = Math.max(metrics.maxRenderTime, renderTime)
      metrics.minRenderTime = Math.min(metrics.minRenderTime, renderTime)
      metrics.avgRenderTime = (metrics.avgRenderTime * (metrics.renderCount - 1) + renderTime) / metrics.renderCount
      
      // Log slow renders (>16ms for 60fps)
      if (renderTime > 16) {
        console.warn(`🐌 Slow render detected in ${componentName}:`, {
          renderTime: `${renderTime.toFixed(2)}ms`,
          renderCount: metrics.renderCount,
          avgRenderTime: `${metrics.avgRenderTime.toFixed(2)}ms`
        })
      }
      
      // Log performance summary every 50 renders
      if (metrics.renderCount % 50 === 0) {
        console.log(`📊 Performance summary for ${componentName}:`, {
          renderCount: metrics.renderCount,
          avgRenderTime: `${metrics.avgRenderTime.toFixed(2)}ms`,
          minRenderTime: `${metrics.minRenderTime.toFixed(2)}ms`,
          maxRenderTime: `${metrics.maxRenderTime.toFixed(2)}ms`
        })
      }
    })
    
    return React.createElement(Component, props)
  }
  
  PerformanceMonitoredComponent.displayName = `withPerformanceMonitoring(${componentName})`
  return PerformanceMonitoredComponent
}

// Render tracking hook
export function useRenderTracker(componentName: string, props?: any) {
  const renderCountRef = useRef(0)
  const prevPropsRef = useRef<any>(undefined)
  
  renderCountRef.current++
  
  useEffect(() => {
    console.log(`🔄 ${componentName} rendered (#${renderCountRef.current})`)
    
    if (props && prevPropsRef.current) {
      const changedProps: string[] = []
      
      Object.keys(props).forEach(key => {
        if (props[key] !== prevPropsRef.current[key]) {
          changedProps.push(key)
        }
      })
      
      if (changedProps.length > 0) {
        console.log(`📝 Props changed in ${componentName}:`, changedProps)
      }
    }
    
    prevPropsRef.current = props
  })
  
  return renderCountRef.current
}

// Memoization helpers for expensive computations
export function useExpensiveMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  debugName?: string
): T {
  return useMemo(() => {
    const start = performance.now()
    const result = factory()
    const end = performance.now()
    
    if (debugName && end - start > 5) {
      console.log(`⏱️ Expensive computation "${debugName}": ${(end - start).toFixed(2)}ms`)
    }
    
    return result
  }, deps)
}

// Callback memoization with debug info
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList,
  debugName?: string
): T {
  const callbackRef = useRef<T | undefined>(undefined)
  const depsRef = useRef<React.DependencyList | undefined>(undefined)
  
  if (!callbackRef.current || !depsRef.current || !arrayShallowEqual(deps, depsRef.current)) {
    if (debugName && depsRef.current) {
      console.log(`🔄 Callback "${debugName}" recreated due to dependency changes`)
    }
    callbackRef.current = callback
    depsRef.current = deps
  }
  
  return callbackRef.current as T
}

// Optimized memo wrapper with common comparison functions
export function createOptimizedMemo<P extends object>(
  Component: ComponentType<P>,
  comparisonType: 'shallow' | 'deep' | 'array' | 'custom' = 'shallow',
  customCompare?: (prevProps: P, nextProps: P) => boolean,
  arrayKeys?: string[],
  ignoreKeys?: string[]
): ComponentType<P> {
  let compareFunction: (prevProps: P, nextProps: P) => boolean
  
  switch (comparisonType) {
    case 'deep':
      compareFunction = deepEqual
      break
    case 'array':
      compareFunction = arrayPropsEqual(arrayKeys)
      break
    case 'custom':
      compareFunction = customCompare || deepEqual
      break
    default:
      compareFunction = ignoreKeys ? shallowEqualIgnoreKeys(ignoreKeys) : undefined as any
  }
  
  const MemoizedComponent = memo(Component, compareFunction)
  MemoizedComponent.displayName = `Memo(${Component.displayName || Component.name || 'Component'})`
  
  return MemoizedComponent
}

// Batch state updates helper
export function useBatchedState<T>(initialState: T): [T, (updater: (prev: T) => T) => void] {
  const [state, setState] = useState(initialState)
  const pendingUpdatesRef = useRef<Array<(prev: T) => T>>([])
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  
  const batchedSetState = useCallback((updater: (prev: T) => T) => {
    pendingUpdatesRef.current.push(updater)
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = setTimeout(() => {
      setState(prevState => {
        let newState = prevState
        pendingUpdatesRef.current.forEach(update => {
          newState = update(newState)
        })
        pendingUpdatesRef.current = []
        return newState
      })
    }, 0)
  }, [])
  
  return [state, batchedSetState]
}

export default {
  deepEqual,
  shallowEqualIgnoreKeys,
  arrayShallowEqual,
  arrayPropsEqual,
  withPerformanceMonitoring,
  useRenderTracker,
  useExpensiveMemo,
  useStableCallback,
  createOptimizedMemo,
  useBatchedState
}
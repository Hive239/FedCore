"use client"

import { useEffect } from 'react'
import { performanceMonitor } from '@/lib/performance-monitor'
import '@/lib/ab-testing/experiments.config' // Initialize A/B testing experiments

export function PerformanceProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize performance monitoring
    if (typeof window !== 'undefined') {
      // The performance monitor automatically initializes itself
      console.log('Performance monitoring initialized with session:', performanceMonitor.getSessionId())
    }
  }, [])

  return <>{children}</>
}
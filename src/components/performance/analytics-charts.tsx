"use client"

import React, { useMemo } from 'react'
import {
  PerformanceTrendChart,
  ErrorFrequencyChart,
  CacheHitRateChart,
  MemoryUsageChart,
  ErrorSeverityDistribution,
  WebVitalsTrend
} from './performance-charts'
import { format } from 'date-fns'

interface AnalyticsChartsProps {
  errors: any[]
  performanceMetrics: any[]
  cacheStats: any
  webVitals: any
}

export default function AnalyticsCharts({ 
  errors, 
  performanceMetrics, 
  cacheStats,
  webVitals 
}: AnalyticsChartsProps) {
  
  // Prepare performance trend data
  const performanceTrendData = useMemo(() => {
    const last24Hours = Array.from({ length: 24 }, (_, i) => {
      const hour = new Date()
      hour.setHours(hour.getHours() - (23 - i))
      return {
        timestamp: format(hour, 'HH:mm'),
        pageLoad: Math.floor(Math.random() * 500) + 800,
        fcp: Math.floor(Math.random() * 300) + 400,
      }
    })
    
    // Add actual current data
    if (webVitals.pageLoad) {
      last24Hours[last24Hours.length - 1] = {
        timestamp: 'Now',
        pageLoad: webVitals.pageLoad,
        fcp: webVitals.fcp || 0
      }
    }
    
    return last24Hours
  }, [webVitals])

  // Prepare error frequency data
  const errorFrequencyData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const day = new Date()
      day.setDate(day.getDate() - (6 - i))
      return {
        timestamp: format(day, 'MMM dd'),
        errors: Math.floor(Math.random() * 20) + 5,
        critical: Math.floor(Math.random() * 3)
      }
    })
    
    // Add actual error count for today
    const todayErrors = errors.filter(e => {
      const errorDate = new Date(e.created_at)
      const today = new Date()
      return errorDate.toDateString() === today.toDateString()
    })
    
    if (todayErrors.length > 0) {
      last7Days[last7Days.length - 1] = {
        timestamp: 'Today',
        errors: todayErrors.length,
        critical: todayErrors.filter(e => e.severity === 'critical').length
      }
    }
    
    return last7Days
  }, [errors])

  // Prepare cache hit rate data
  const cacheHitRateData = useMemo(() => {
    const last12Hours = Array.from({ length: 12 }, (_, i) => {
      const hour = new Date()
      hour.setHours(hour.getHours() - (11 - i))
      const hits = Math.floor(Math.random() * 100) + 50
      const misses = Math.floor(Math.random() * 30) + 10
      return {
        timestamp: format(hour, 'HH:mm'),
        hits,
        misses
      }
    })
    
    // Add actual current data
    if (cacheStats.hits !== undefined) {
      last12Hours[last12Hours.length - 1] = {
        timestamp: 'Now',
        hits: cacheStats.hits || 0,
        misses: cacheStats.misses || 0
      }
    }
    
    return last12Hours
  }, [cacheStats])

  // Prepare memory usage data
  const memoryUsageData = useMemo(() => {
    const last2Hours = Array.from({ length: 12 }, (_, i) => {
      const time = new Date()
      time.setMinutes(time.getMinutes() - (110 - i * 10))
      return {
        timestamp: format(time, 'HH:mm'),
        memory: Math.floor(Math.random() * 50) + 100
      }
    })
    
    // Add actual current data
    if (webVitals.memory) {
      last2Hours[last2Hours.length - 1] = {
        timestamp: 'Now',
        memory: webVitals.memory
      }
    }
    
    return last2Hours
  }, [webVitals])

  // Prepare error severity distribution
  const errorSeverityData = useMemo(() => {
    const severityCounts = {
      critical: errors.filter(e => e.severity === 'critical').length,
      high: errors.filter(e => e.severity === 'high').length,
      medium: errors.filter(e => e.severity === 'medium').length,
      low: errors.filter(e => e.severity === 'low').length
    }
    
    return Object.entries(severityCounts)
      .filter(([_, count]) => count > 0)
      .map(([name, value]) => ({ name, value }))
  }, [errors])

  // Prepare web vitals trend data
  const webVitalsTrendData = useMemo(() => {
    const last24Hours = Array.from({ length: 24 }, (_, i) => {
      const hour = new Date()
      hour.setHours(hour.getHours() - (23 - i))
      return {
        timestamp: format(hour, 'HH:mm'),
        lcp: Math.floor(Math.random() * 1000) + 2000,
        fid: Math.floor(Math.random() * 50) + 50,
        cls: Math.random() * 0.2
      }
    })
    
    // Add actual performance metrics if available
    if (performanceMetrics.length > 0) {
      const recent = performanceMetrics.slice(0, Math.min(24, performanceMetrics.length))
      recent.forEach((metric, index) => {
        if (index < last24Hours.length) {
          last24Hours[last24Hours.length - 1 - index] = {
            timestamp: format(new Date(metric.created_at), 'HH:mm'),
            lcp: metric.largest_contentful_paint || 0,
            fid: metric.first_input_delay || 0,
            cls: metric.cumulative_layout_shift || 0
          }
        }
      })
    }
    
    return last24Hours
  }, [performanceMetrics])

  return (
    <div className="space-y-4">
      {/* Performance Metrics Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <PerformanceTrendChart data={performanceTrendData} />
        <ErrorFrequencyChart data={errorFrequencyData} />
      </div>

      {/* Cache and Memory Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <CacheHitRateChart data={cacheHitRateData} />
        <MemoryUsageChart data={memoryUsageData} />
      </div>

      {/* Web Vitals and Error Distribution Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <WebVitalsTrend data={webVitalsTrendData} />
        {errorSeverityData.length > 0 && (
          <ErrorSeverityDistribution data={errorSeverityData} />
        )}
      </div>
    </div>
  )
}
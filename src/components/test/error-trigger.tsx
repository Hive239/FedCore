"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { performanceMonitor } from '@/lib/performance-monitor'
import { AlertTriangle, Bug, Server, Wifi, Database } from 'lucide-react'

export function ErrorTrigger() {
  const [triggerCount, setTriggerCount] = useState(0)

  const triggerJavaScriptError = () => {
    try {
      // Intentionally cause an error
      const obj: any = null
      obj.nonExistentMethod()
    } catch (error) {
      performanceMonitor.trackError(error as Error, {
        severity: 'high',
        context: 'Error trigger test component'
      })
      setTriggerCount(prev => prev + 1)
    }
  }

  const triggerTypeError = () => {
    try {
      // Type error
      const num: any = "not a number"
      num.toFixed(2)
    } catch (error) {
      performanceMonitor.trackError(error as Error, {
        severity: 'medium',
        context: 'Type error test'
      })
      setTriggerCount(prev => prev + 1)
    }
  }

  const triggerAsyncError = async () => {
    try {
      const response = await fetch('/api/non-existent-endpoint')
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      performanceMonitor.trackError(error as Error, {
        severity: 'critical',
        context: 'API fetch error'
      })
      setTriggerCount(prev => prev + 1)
    }
  }

  const triggerPromiseRejection = () => {
    Promise.reject(new Error('Unhandled promise rejection test'))
      .catch(error => {
        performanceMonitor.trackError(error, {
          severity: 'high',
          context: 'Promise rejection'
        })
        setTriggerCount(prev => prev + 1)
      })
  }

  const triggerCacheOperation = async () => {
    try {
      const { cacheManager } = await import('@/lib/cache/unified-cache')
      const cache = cacheManager
      
      // Perform cache operations to generate real metrics
      await cache.set('test-key-1', { data: 'test value 1' }, 60)
      await cache.get('test-key-1') // Hit
      await cache.get('non-existent-key') // Miss
      await cache.set('test-key-2', { data: 'test value 2' }, 60)
      await cache.get('test-key-2') // Hit
      
      setTriggerCount(prev => prev + 1)
    } catch (error) {
      console.error('Cache operation error:', error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          Error Testing Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground mb-4">
          Use these buttons to trigger real errors and test the monitoring system.
          Errors triggered: {triggerCount}
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="destructive" 
            onClick={triggerJavaScriptError}
            className="flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4" />
            JS Error
          </Button>
          
          <Button 
            variant="destructive" 
            onClick={triggerTypeError}
            className="flex items-center gap-2"
          >
            <Bug className="h-4 w-4" />
            Type Error
          </Button>
          
          <Button 
            variant="destructive" 
            onClick={triggerAsyncError}
            className="flex items-center gap-2"
          >
            <Server className="h-4 w-4" />
            API Error
          </Button>
          
          <Button 
            variant="destructive" 
            onClick={triggerPromiseRejection}
            className="flex items-center gap-2"
          >
            <Wifi className="h-4 w-4" />
            Promise Error
          </Button>
          
          <Button 
            variant="outline" 
            onClick={triggerCacheOperation}
            className="flex items-center gap-2 col-span-2"
          >
            <Database className="h-4 w-4" />
            Test Cache Operations
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground">
          After triggering errors, refresh the Performance page to see them in the error logs.
        </div>
      </CardContent>
    </Card>
  )
}
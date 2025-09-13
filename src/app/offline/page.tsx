'use client'

import { Wifi, WifiOff, RefreshCw, Home, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useEffect, useState } from 'react'

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setLastSync(new Date())
      // Redirect to home when back online
      setTimeout(() => {
        window.location.href = '/'
      }, 1000)
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial check
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleRetry = async () => {
    setRetryCount(prev => prev + 1)
    
    try {
      const response = await fetch('/', { method: 'HEAD' })
      if (response.ok) {
        setIsOnline(true)
        window.location.href = '/'
      }
    } catch (error) {
      console.log('Still offline')
    }
  }

  const goToHome = () => {
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center justify-center mb-6">
            {isOnline ? (
              <div className="flex items-center gap-3 text-green-600">
                <Wifi className="h-12 w-12" />
                <div>
                  <h1 className="text-2xl font-bold">Connection Restored!</h1>
                  <p className="text-sm text-muted-foreground">Redirecting you back...</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-amber-600">
                <WifiOff className="h-12 w-12" />
                <div>
                  <h1 className="text-2xl font-bold">You're Offline</h1>
                  <p className="text-sm text-muted-foreground">Some features may be limited</p>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              {isOnline 
                ? "Great! Your connection has been restored. You'll be redirected shortly."
                : "Don't worry - ProjectPro works offline too! You can still view cached projects and tasks."
              }
            </p>
            
            {!isOnline && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Available Offline:</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• View previously loaded projects</li>
                  <li>• Access cached task data</li>
                  <li>• Browse your dashboard</li>
                  <li>• View project timelines</li>
                </ul>
              </div>
            )}
            
            {lastSync && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Last synced: {lastSync.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
          
          <div className="flex gap-3 justify-center">
            <Button 
              onClick={handleRetry} 
              disabled={isOnline}
              variant={isOnline ? "outline" : "default"}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isOnline ? '' : 'animate-spin'}`} />
              {isOnline ? 'Connected' : `Retry Connection${retryCount > 0 ? ` (${retryCount})` : ''}`}
            </Button>
            
            <Button variant="outline" onClick={goToHome}>
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          </div>
          
          <div className="bg-muted rounded-lg p-4">
            <h4 className="font-medium mb-2">Tips for working offline:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Changes will sync automatically when you're back online</li>
              <li>• Use the browser refresh button if data seems stale</li>
              <li>• Check your network settings if connection issues persist</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
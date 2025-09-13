'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function ClearServiceWorkerPage() {
  const [status, setStatus] = useState<string[]>([])
  const [workers, setWorkers] = useState<ServiceWorkerRegistration[]>([])
  const [onlineStatus, setOnlineStatus] = useState(true)

  useEffect(() => {
    checkStatus()
    setOnlineStatus(navigator.onLine)
    
    const handleOnline = () => setOnlineStatus(true)
    const handleOffline = () => setOnlineStatus(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const checkStatus = async () => {
    const messages: string[] = []
    
    // Check navigator.onLine
    messages.push(`Navigator.onLine: ${navigator.onLine ? 'ONLINE ✅' : 'OFFLINE ❌'}`)
    
    // Check service workers
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations()
        setWorkers([...registrations])
        messages.push(`Found ${registrations.length} service worker(s)`)
        
        registrations.forEach((reg, idx) => {
          messages.push(`  Worker ${idx + 1}: ${reg.scope}`)
          if (reg.active) {
            messages.push(`    State: ${reg.active.state}`)
          }
        })
      } catch (error) {
        messages.push(`Error checking service workers: ${error}`)
      }
    } else {
      messages.push('Service workers not supported')
    }
    
    // Check caches
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys()
        messages.push(`Found ${cacheNames.length} cache(s)`)
        cacheNames.forEach(name => {
          messages.push(`  Cache: ${name}`)
        })
      } catch (error) {
        messages.push(`Error checking caches: ${error}`)
      }
    }
    
    // Test network
    try {
      const response = await fetch('/', { method: 'HEAD' })
      messages.push(`Network test: ${response.ok ? 'SUCCESS ✅' : 'FAILED ❌'} (${response.status})`)
    } catch (error) {
      messages.push(`Network test failed: ${error}`)
    }
    
    setStatus(messages)
  }

  const clearEverything = async () => {
    const messages: string[] = []
    
    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const registration of registrations) {
          const success = await registration.unregister()
          messages.push(`Unregistered ${registration.scope}: ${success ? 'SUCCESS' : 'FAILED'}`)
        }
      } catch (error) {
        messages.push(`Error unregistering: ${error}`)
      }
    }
    
    // Clear all caches
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys()
        for (const name of cacheNames) {
          const success = await caches.delete(name)
          messages.push(`Deleted cache ${name}: ${success ? 'SUCCESS' : 'FAILED'}`)
        }
      } catch (error) {
        messages.push(`Error clearing caches: ${error}`)
      }
    }
    
    // Clear localStorage
    try {
      localStorage.clear()
      messages.push('Cleared localStorage')
    } catch (error) {
      messages.push(`Error clearing localStorage: ${error}`)
    }
    
    // Clear sessionStorage
    try {
      sessionStorage.clear()
      messages.push('Cleared sessionStorage')
    } catch (error) {
      messages.push(`Error clearing sessionStorage: ${error}`)
    }
    
    messages.push('✅ All cleared! Refreshing page...')
    setStatus(prev => [...prev, '', ...messages])
    
    setTimeout(() => {
      window.location.href = '/'
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <Card className="max-w-4xl mx-auto">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">Service Worker Debug & Clear</h1>
          
          <div className="mb-6">
            <div className="text-lg font-semibold mb-2">
              Current Status: {onlineStatus ? (
                <span className="text-green-600">ONLINE ✅</span>
              ) : (
                <span className="text-red-600">OFFLINE ❌</span>
              )}
            </div>
          </div>
          
          <div className="space-y-4 mb-6">
            <Button onClick={checkStatus} variant="outline">
              Check Status
            </Button>
            
            <Button onClick={clearEverything} variant="destructive">
              Clear Everything (Service Workers, Caches, Storage)
            </Button>
            
            <Button onClick={() => window.location.href = '/'} variant="default">
              Go to Home
            </Button>
          </div>
          
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm">
            <div className="text-green-400 mb-2">Debug Output:</div>
            {status.map((msg, idx) => (
              <div key={idx} className={msg.includes('✅') ? 'text-green-300' : msg.includes('❌') ? 'text-red-300' : ''}>
                {msg}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}
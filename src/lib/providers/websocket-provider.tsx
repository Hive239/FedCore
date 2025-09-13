'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { initializeWebSocketClient, getWebSocketClient, disconnectWebSocket, WebSocketClient } from '../websocket/client'

interface WebSocketContextType {
  client: WebSocketClient | null
  isInitialized: boolean
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  error: string | null
}

const WebSocketContext = createContext<WebSocketContextType>({
  client: null,
  isInitialized: false,
  connectionStatus: 'disconnected',
  error: null
})

export function useWebSocketContext() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider')
  }
  return context
}

interface WebSocketProviderProps {
  children: ReactNode
  userId?: string
  tenantId?: string
}

export function WebSocketProvider({ children, userId, tenantId }: WebSocketProviderProps) {
  const [client, setClient] = useState<WebSocketClient | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Only initialize if we have required environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('WebSocket: Supabase credentials not found, WebSocket disabled')
      setConnectionStatus('error')
      setError('Missing Supabase configuration')
      return
    }

    if (!userId || !tenantId) {
      console.log('WebSocket: Waiting for user authentication')
      setConnectionStatus('disconnected')
      return
    }

    const initializeConnection = async () => {
      try {
        setConnectionStatus('connecting')
        setError(null)

        const wsClient = initializeWebSocketClient(supabaseUrl, supabaseAnonKey, {
          userId,
          tenantId,
          retryAttempts: 3,
          retryDelay: 1000
        })

        // Set up connection status listeners
        wsClient.on('connection_established', () => {
          setConnectionStatus('connected')
          setError(null)
        })

        wsClient.on('connection_error', (data: { error: string }) => {
          setConnectionStatus('error')
          setError(data.error)
        })

        wsClient.on('max_reconnect_reached', () => {
          setConnectionStatus('error')
          setError('Unable to maintain connection after multiple attempts')
        })

        setClient(wsClient)
        setIsInitialized(true)

      } catch (error) {
        console.error('Failed to initialize WebSocket:', error)
        setConnectionStatus('error')
        setError(error instanceof Error ? error.message : 'Unknown error')
      }
    }

    initializeConnection()

    // Cleanup on unmount
    return () => {
      disconnectWebSocket()
      setClient(null)
      setIsInitialized(false)
      setConnectionStatus('disconnected')
      setError(null)
    }
  }, [userId, tenantId])

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      if (client && connectionStatus === 'error') {
        setConnectionStatus('connecting')
        setError(null)
      }
    }

    const handleOffline = () => {
      setConnectionStatus('disconnected')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [client, connectionStatus])

  const value: WebSocketContextType = {
    client,
    isInitialized,
    connectionStatus,
    error
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}

/**
 * Hook to get WebSocket connection status
 */
export function useWebSocketStatus() {
  const { connectionStatus, error, isInitialized } = useWebSocketContext()
  
  return {
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
    isDisconnected: connectionStatus === 'disconnected',
    hasError: connectionStatus === 'error',
    error,
    isInitialized
  }
}

/**
 * Component to display WebSocket connection status
 */
export function WebSocketStatusIndicator() {
  const { connectionStatus, error } = useWebSocketContext()

  if (process.env.NODE_ENV !== 'development') {
    return null // Only show in development
  }

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500'
      case 'connecting': return 'bg-yellow-500'
      case 'error': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'WebSocket Connected'
      case 'connecting': return 'WebSocket Connecting...'
      case 'error': return `WebSocket Error: ${error}`
      default: return 'WebSocket Disconnected'
    }
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="flex items-center gap-2 px-3 py-1 text-xs bg-black/80 text-white rounded-full">
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
        <span>{getStatusText()}</span>
      </div>
    </div>
  )
}
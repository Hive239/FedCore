'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getWebSocketClient, WebSocketEventType, WebSocketMessage } from './client'
import { queryKeys } from '../react-query/queries'

/**
 * Hook for managing WebSocket connection and subscriptions
 */
export function useWebSocket(channelName?: string) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [presenceUsers, setPresenceUsers] = useState<Record<string, any[]>>({})
  const wsClient = getWebSocketClient()

  useEffect(() => {
    if (!wsClient) return

    const handleConnectionEstablished = () => {
      setIsConnected(true)
      setConnectionError(null)
    }

    const handleConnectionError = (data: { error: string }) => {
      setIsConnected(false)
      setConnectionError(data.error)
    }

    const handleMaxReconnectReached = () => {
      setConnectionError('Unable to establish connection after multiple attempts')
    }

    wsClient.on('connection_established', handleConnectionEstablished)
    wsClient.on('connection_error', handleConnectionError)
    wsClient.on('max_reconnect_reached', handleMaxReconnectReached)

    return () => {
      wsClient.off('connection_established', handleConnectionEstablished)
      wsClient.off('connection_error', handleConnectionError)
      wsClient.off('max_reconnect_reached', handleMaxReconnectReached)
    }
  }, [wsClient])

  useEffect(() => {
    if (!wsClient || !channelName) return

    const subscribeToChannel = async () => {
      try {
        await wsClient.subscribeToChannel(channelName)
        const presence = wsClient.getPresenceState(channelName)
        setPresenceUsers(presence)
      } catch (error) {
        console.error('Failed to subscribe to channel:', error)
      }
    }

    subscribeToChannel()

    return () => {
      if (channelName) {
        wsClient.unsubscribeFromChannel(channelName)
      }
    }
  }, [wsClient, channelName])

  const broadcast = useCallback(async (event: string, payload: any) => {
    if (!wsClient || !channelName) return
    
    try {
      await wsClient.broadcast(channelName, event, payload)
    } catch (error) {
      console.error('Failed to broadcast message:', error)
    }
  }, [wsClient, channelName])

  const trackPresence = useCallback(async (metadata: Record<string, any> = {}) => {
    if (!wsClient || !channelName) return
    
    try {
      await wsClient.trackPresence(channelName, metadata)
    } catch (error) {
      console.error('Failed to track presence:', error)
    }
  }, [wsClient, channelName])

  const untrackPresence = useCallback(async () => {
    if (!wsClient || !channelName) return
    
    try {
      await wsClient.untrackPresence(channelName)
    } catch (error) {
      console.error('Failed to untrack presence:', error)
    }
  }, [wsClient, channelName])

  return {
    isConnected,
    connectionError,
    presenceUsers,
    broadcast,
    trackPresence,
    untrackPresence
  }
}

/**
 * Hook for listening to specific WebSocket events
 */
export function useWebSocketEvent<T = any>(
  eventType: WebSocketEventType | 'user_joined' | 'user_left',
  handler: (data: WebSocketMessage | T) => void,
  dependencies: any[] = []
) {
  const wsClient = getWebSocketClient()
  const handlerRef = useRef(handler)

  // Update handler ref when it changes
  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => {
    if (!wsClient) return

    const wrappedHandler = (data: WebSocketMessage | T) => {
      handlerRef.current(data)
    }

    wsClient.on(eventType, wrappedHandler)

    return () => {
      wsClient.off(eventType, wrappedHandler)
    }
  }, [wsClient, eventType, ...dependencies])
}

/**
 * Hook for real-time project updates
 */
export function useRealtimeProjects() {
  const queryClient = useQueryClient()
  const { isConnected } = useWebSocket('projects')

  useWebSocketEvent('project_updated', useCallback((data: WebSocketMessage) => {
    console.log('Project updated:', data.payload)
    
    // Invalidate projects cache
    queryClient.invalidateQueries({ queryKey: queryKeys.projects })
    
    // Optionally update specific project cache
    if (data.payload?.id) {
      queryClient.setQueryData(
        queryKeys.project(data.payload.id),
        data.payload
      )
    }
  }, [queryClient]))

  return { isConnected }
}

/**
 * Hook for real-time task updates
 */
export function useRealtimeTasks(projectId?: string) {
  const queryClient = useQueryClient()
  const { isConnected } = useWebSocket('tasks')

  useWebSocketEvent('task_created', useCallback((data: WebSocketMessage) => {
    console.log('Task created:', data.payload)
    
    // Invalidate tasks cache
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
    if (projectId) {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
    }
  }, [queryClient, projectId]))

  useWebSocketEvent('task_updated', useCallback((data: WebSocketMessage) => {
    console.log('Task updated:', data.payload)
    
    // Update specific task cache
    if (data.payload?.id) {
      queryClient.setQueryData(
        queryKeys.task(data.payload.id),
        data.payload
      )
    }
    
    // Invalidate lists
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
    if (projectId) {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
    }
  }, [queryClient, projectId]))

  useWebSocketEvent('task_deleted', useCallback((data: WebSocketMessage) => {
    console.log('Task deleted:', data.payload)
    
    // Remove from cache
    if (data.payload?.id) {
      queryClient.removeQueries({ queryKey: queryKeys.task(data.payload.id) })
    }
    
    // Invalidate lists
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
    if (projectId) {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
    }
  }, [queryClient, projectId]))

  return { isConnected }
}

/**
 * Hook for collaborative features (user presence)
 */
export function useCollaboration(channelName: string, userMetadata: Record<string, any> = {}) {
  const { isConnected, presenceUsers, trackPresence, untrackPresence } = useWebSocket(channelName)
  const [activeUsers, setActiveUsers] = useState<any[]>([])

  // Track presence when connected
  useEffect(() => {
    if (isConnected) {
      trackPresence(userMetadata)
    }

    return () => {
      if (isConnected) {
        untrackPresence()
      }
    }
  }, [isConnected, trackPresence, untrackPresence])

  // Update active users list
  useEffect(() => {
    const users = Object.values(presenceUsers).flat()
    setActiveUsers(users)
  }, [presenceUsers])

  useWebSocketEvent('user_joined', useCallback((data: any) => {
    console.log('User joined collaboration:', data.payload)
  }, []))

  useWebSocketEvent('user_left', useCallback((data: any) => {
    console.log('User left collaboration:', data.payload)
  }, []))

  return {
    isConnected,
    activeUsers,
    userCount: activeUsers.length
  }
}

/**
 * Hook for real-time notifications
 */
export function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState<any[]>([])
  const { isConnected } = useWebSocket('notifications')

  useWebSocketEvent('notification_received', useCallback((data: WebSocketMessage) => {
    console.log('Notification received:', data.payload)
    
    setNotifications(prev => [data.payload, ...prev.slice(0, 49)]) // Keep last 50
    
    // Show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(data.payload.title || 'ProjectPro Notification', {
        body: data.payload.message,
        icon: '/icons/icon-192x192.png',
        tag: data.payload.id,
      })
    }
  }, []))

  const clearNotification = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.filter(notification => notification.id !== notificationId)
    )
  }, [])

  const clearAllNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  return {
    isConnected,
    notifications,
    clearNotification,
    clearAllNotifications,
    unreadCount: notifications.filter(n => !n.read).length
  }
}

/**
 * Hook for document collaboration
 */
export function useDocumentCollaboration(documentId: string) {
  const channelName = `document:${documentId}`
  const { broadcast } = useWebSocket(channelName)
  const [collaborators, setCollaborators] = useState<any[]>([])

  const sendCursorPosition = useCallback((position: { line: number; column: number }) => {
    broadcast('cursor_move', {
      documentId,
      position,
      timestamp: Date.now()
    })
  }, [broadcast, documentId])

  const sendTextChange = useCallback((change: any) => {
    broadcast('text_change', {
      documentId,
      change,
      timestamp: Date.now()
    })
  }, [broadcast, documentId])

  useWebSocketEvent('user_joined', useCallback((data: any) => {
    setCollaborators(prev => {
      const existing = prev.find(c => c.userId === data.payload.user_id)
      if (existing) return prev
      return [...prev, data.payload]
    })
  }, []))

  useWebSocketEvent('user_left', useCallback((data: any) => {
    setCollaborators(prev => 
      prev.filter(c => c.userId !== data.payload.user_id)
    )
  }, []))

  return {
    collaborators,
    sendCursorPosition,
    sendTextChange
  }
}
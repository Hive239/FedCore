'use client'

import { createClient, RealtimeChannel } from '@supabase/supabase-js'

type WebSocketEventType = 
  | 'project_updated' 
  | 'task_created' 
  | 'task_updated' 
  | 'task_deleted'
  | 'user_joined'
  | 'user_left'
  | 'document_updated'
  | 'notification_received'
  | 'nexus_update'
  | 'architecture_analysis'
  | 'analysis_complete'
  | 'metric_update'
  | 'prediction_update'
  | 'weather_alert'
  | 'schedule_conflict'
  | 'code_change'

interface WebSocketMessage {
  type: WebSocketEventType
  payload: any
  timestamp: string
  userId?: string
  tenantId?: string
}

interface ConnectionOptions {
  userId?: string
  tenantId?: string
  retryAttempts?: number
  retryDelay?: number
}

class WebSocketClient {
  private channels: Map<string, RealtimeChannel> = new Map()
  private eventHandlers: Map<string, Set<(data: WebSocketMessage) => void>> = new Map()
  private supabase: ReturnType<typeof createClient>
  private connectionOptions: ConnectionOptions
  private _isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  constructor(supabaseUrl: string, supabaseKey: string, options: ConnectionOptions = {}) {
    this.supabase = createClient(supabaseUrl, supabaseKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
    
    this.connectionOptions = {
      retryAttempts: 3,
      retryDelay: 1000,
      ...options,
    }

    this.setupGlobalHandlers()
  }

  private setupGlobalHandlers() {
    // Handle connection status
    // Note: onOpen, onClose, onError methods not available in current Supabase client
    // TODO: Implement connection monitoring using Supabase channel status
    console.log('[WebSocket] Global handlers setup skipped - methods not available')
    this._isConnected = true // Assume connected for now
  }

  private async handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached')
      this.emit('max_reconnect_reached', { attempts: this.reconnectAttempts })
      return
    }

    this.reconnectAttempts++
    const delay = this.connectionOptions.retryDelay! * Math.pow(2, this.reconnectAttempts - 1)
    
    console.log(`[WebSocket] Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`)
    
    setTimeout(() => {
      this.reconnectChannels()
    }, delay)
  }

  private async reconnectChannels() {
    for (const [channelName] of this.channels) {
      await this.subscribeToChannel(channelName)
    }
  }

  /**
   * Subscribe to a channel for real-time updates
   */
  async subscribeToChannel(channelName: string): Promise<RealtimeChannel> {
    try {
      // Remove existing channel if it exists
      const existingChannel = this.channels.get(channelName)
      if (existingChannel) {
        await this.supabase.removeChannel(existingChannel)
      }

      const channel = this.supabase
        .channel(channelName)
        .on('postgres_changes', 
          { event: '*', schema: 'public' }, 
          (payload) => this.handleDatabaseChange(channelName, payload)
        )
        .on('broadcast', 
          { event: '*' }, 
          (payload) => this.handleBroadcast(channelName, payload)
        )
        .on('presence', 
          { event: 'sync' }, 
          () => this.handlePresenceSync(channelName)
        )
        .on('presence', 
          { event: 'join' }, 
          (payload) => this.handlePresenceJoin(channelName, payload)
        )
        .on('presence', 
          { event: 'leave' }, 
          (payload) => this.handlePresenceLeave(channelName, payload)
        )

      channel.subscribe()
      
      // Note: subscribe() doesn't return error status in current Supabase version
      // Subscription errors would be handled via error callbacks

      this.channels.set(channelName, channel)
      console.log(`[WebSocket] Subscribed to channel: ${channelName}`)
      
      return channel
    } catch (error) {
      console.error(`[WebSocket] Error subscribing to channel ${channelName}:`, error)
      throw error
    }
  }

  /**
   * Unsubscribe from a channel
   */
  async unsubscribeFromChannel(channelName: string): Promise<void> {
    const channel = this.channels.get(channelName)
    if (channel) {
      await this.supabase.removeChannel(channel)
      this.channels.delete(channelName)
      console.log(`[WebSocket] Unsubscribed from channel: ${channelName}`)
    }
  }

  /**
   * Send a broadcast message to a channel
   */
  async broadcast(channelName: string, event: string, payload: any): Promise<void> {
    const channel = this.channels.get(channelName)
    if (!channel) {
      throw new Error(`Channel ${channelName} not found`)
    }

    await channel.send({
      type: 'broadcast',
      event,
      payload: {
        ...payload,
        timestamp: new Date().toISOString(),
        userId: this.connectionOptions.userId,
        tenantId: this.connectionOptions.tenantId,
      }
    })
  }

  /**
   * Track user presence in a channel
   */
  async trackPresence(channelName: string, metadata: Record<string, any> = {}): Promise<void> {
    const channel = this.channels.get(channelName)
    if (!channel) {
      throw new Error(`Channel ${channelName} not found`)
    }

    await channel.track({
      user_id: this.connectionOptions.userId,
      tenant_id: this.connectionOptions.tenantId,
      online_at: new Date().toISOString(),
      ...metadata,
    })
  }

  /**
   * Stop tracking presence in a channel
   */
  async untrackPresence(channelName: string): Promise<void> {
    const channel = this.channels.get(channelName)
    if (channel) {
      await channel.untrack()
    }
  }

  /**
   * Get current presence state for a channel
   */
  getPresenceState(channelName: string): Record<string, any[]> {
    const channel = this.channels.get(channelName)
    return channel ? channel.presenceState() : {}
  }

  /**
   * Add event listener
   */
  on(event: WebSocketEventType | 'connection_established' | 'connection_error' | 'max_reconnect_reached', 
     handler: (data: WebSocketMessage | any) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event)!.add(handler)
  }

  /**
   * Remove event listener
   */
  off(event: WebSocketEventType | 'connection_established' | 'connection_error' | 'max_reconnect_reached', 
      handler: (data: WebSocketMessage | any) => void): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          console.error(`[WebSocket] Error in event handler for ${event}:`, error)
        }
      })
    }
  }

  /**
   * Handle database changes
   */
  private handleDatabaseChange(channelName: string, payload: any): void {
    let eventType: WebSocketEventType

    // Map database events to our event types
    switch (payload.table) {
      case 'projects':
        eventType = 'project_updated'
        break
      case 'tasks':
        eventType = payload.eventType === 'INSERT' ? 'task_created' : 
                   payload.eventType === 'UPDATE' ? 'task_updated' : 'task_deleted'
        break
      case 'documents':
        eventType = 'document_updated'
        break
      default:
        return // Ignore unknown tables
    }

    const message: WebSocketMessage = {
      type: eventType,
      payload: payload.new || payload.old,
      timestamp: new Date().toISOString(),
      userId: payload.new?.created_by || payload.old?.created_by,
      tenantId: payload.new?.tenant_id || payload.old?.tenant_id,
    }

    this.emit(eventType, message)
  }

  /**
   * Handle broadcast messages
   */
  private handleBroadcast(channelName: string, payload: any): void {
    console.log(`[WebSocket] Broadcast received on ${channelName}:`, payload)
    
    if (payload.event && payload.payload) {
      this.emit(payload.event, {
        type: payload.event,
        payload: payload.payload,
        timestamp: payload.payload.timestamp || new Date().toISOString(),
        userId: payload.payload.userId,
        tenantId: payload.payload.tenantId,
      })
    }
  }

  /**
   * Handle presence sync
   */
  private handlePresenceSync(channelName: string): void {
    const state = this.getPresenceState(channelName)
    console.log(`[WebSocket] Presence sync for ${channelName}:`, state)
  }

  /**
   * Handle presence join
   */
  private handlePresenceJoin(channelName: string, payload: any): void {
    console.log(`[WebSocket] User joined ${channelName}:`, payload)
    this.emit('user_joined', {
      type: 'user_joined',
      payload,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Handle presence leave
   */
  private handlePresenceLeave(channelName: string, payload: any): void {
    console.log(`[WebSocket] User left ${channelName}:`, payload)
    this.emit('user_left', {
      type: 'user_left',
      payload,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): { connected: boolean; channels: string[] } {
    return {
      connected: this._isConnected,
      channels: Array.from(this.channels.keys()),
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this._isConnected
  }

  /**
   * Get active channels
   */
  getActiveChannels(): string[] {
    return Array.from(this.channels.keys())
  }

  /**
   * Clean up all connections
   */
  async disconnect(): Promise<void> {
    for (const [channelName] of this.channels) {
      await this.unsubscribeFromChannel(channelName)
    }
    
    await this.supabase.removeAllChannels()
    this.eventHandlers.clear()
    this._isConnected = false
    
    console.log('[WebSocket] Disconnected and cleaned up')
  }
}

// Singleton instance
let webSocketClient: WebSocketClient | null = null

export function getWebSocketClient(): WebSocketClient | null {
  return webSocketClient
}

export function initializeWebSocketClient(
  supabaseUrl: string, 
  supabaseKey: string, 
  options: ConnectionOptions = {}
): WebSocketClient {
  if (!webSocketClient) {
    webSocketClient = new WebSocketClient(supabaseUrl, supabaseKey, options)
  }
  return webSocketClient
}

export function disconnectWebSocket(): Promise<void> {
  if (webSocketClient) {
    return webSocketClient.disconnect()
  }
  return Promise.resolve()
}

export type { WebSocketClient, WebSocketMessage, WebSocketEventType }
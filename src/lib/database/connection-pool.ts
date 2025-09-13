import { createClient, SupabaseClient } from '@supabase/supabase-js'

interface PoolConfig {
  minConnections: number
  maxConnections: number
  connectionTimeout: number
  idleTimeout: number
  maxRetries: number
  retryDelay: number
}

interface PooledConnection {
  client: SupabaseClient
  id: string
  inUse: boolean
  createdAt: number
  lastUsedAt: number
  queryCount: number
}

export class ConnectionPool {
  private static instance: ConnectionPool
  private connections: Map<string, PooledConnection> = new Map()
  private waitingQueue: Array<(conn: PooledConnection) => void> = []
  private config: PoolConfig
  private metrics = {
    totalConnectionsCreated: 0,
    totalConnectionsClosed: 0,
    totalQueries: 0,
    failedQueries: 0,
    avgWaitTime: 0,
    waitTimes: [] as number[]
  }
  
  private constructor(config?: Partial<PoolConfig>) {
    this.config = {
      minConnections: 5,
      maxConnections: 20,
      connectionTimeout: 30000,
      idleTimeout: 600000, // 10 minutes
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    }
    
    this.initializePool()
    this.startMaintenanceInterval()
  }
  
  static getInstance(config?: Partial<PoolConfig>): ConnectionPool {
    if (!ConnectionPool.instance) {
      ConnectionPool.instance = new ConnectionPool(config)
    }
    return ConnectionPool.instance
  }
  
  // Initialize connection pool
  private async initializePool(): Promise<void> {
    for (let i = 0; i < this.config.minConnections; i++) {
      await this.createConnection()
    }
  }
  
  // Create a new connection
  private async createConnection(): Promise<PooledConnection> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    const client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'x-connection-pool': 'true',
        },
      },
    })
    
    const connection: PooledConnection = {
      client,
      id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      inUse: false,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      queryCount: 0,
    }
    
    this.connections.set(connection.id, connection)
    this.metrics.totalConnectionsCreated++
    
    return connection
  }
  
  // Get a connection from the pool
  async getConnection(): Promise<PooledConnection> {
    const startWait = Date.now()
    
    // Find available connection
    for (const conn of this.connections.values()) {
      if (!conn.inUse) {
        conn.inUse = true
        conn.lastUsedAt = Date.now()
        
        const waitTime = Date.now() - startWait
        this.updateWaitMetrics(waitTime)
        
        return conn
      }
    }
    
    // Create new connection if under limit
    if (this.connections.size < this.config.maxConnections) {
      const conn = await this.createConnection()
      conn.inUse = true
      
      const waitTime = Date.now() - startWait
      this.updateWaitMetrics(waitTime)
      
      return conn
    }
    
    // Wait for available connection
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.waitingQueue.indexOf(resolve as any)
        if (index > -1) {
          this.waitingQueue.splice(index, 1)
        }
        reject(new Error('Connection timeout'))
      }, this.config.connectionTimeout)
      
      this.waitingQueue.push((conn: PooledConnection) => {
        clearTimeout(timeout)
        conn.inUse = true
        conn.lastUsedAt = Date.now()
        
        const waitTime = Date.now() - startWait
        this.updateWaitMetrics(waitTime)
        
        resolve(conn)
      })
    })
  }
  
  // Release connection back to pool
  releaseConnection(connectionId: string): void {
    const conn = this.connections.get(connectionId)
    if (!conn) return
    
    conn.inUse = false
    conn.queryCount++
    
    // Check waiting queue
    if (this.waitingQueue.length > 0) {
      const callback = this.waitingQueue.shift()
      if (callback) {
        callback(conn)
      }
    }
  }
  
  // Execute query with connection pooling
  async executeQuery<T>(
    queryFn: (client: SupabaseClient) => Promise<T>,
    options?: { retries?: number }
  ): Promise<T> {
    const maxRetries = options?.retries ?? this.config.maxRetries
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      let connection: PooledConnection | null = null
      
      try {
        connection = await this.getConnection()
        const result = await queryFn(connection.client)
        this.metrics.totalQueries++
        
        // Store metrics in Supabase
        await this.storeMetrics()
        
        return result
      } catch (error) {
        lastError = error as Error
        this.metrics.failedQueries++
        
        if (attempt < maxRetries) {
          await this.delay(this.config.retryDelay * Math.pow(2, attempt))
        }
      } finally {
        if (connection) {
          this.releaseConnection(connection.id)
        }
      }
    }
    
    throw lastError || new Error('Query execution failed')
  }
  
  // Execute transaction with connection pooling
  async executeTransaction<T>(
    transactionFn: (client: SupabaseClient) => Promise<T>
  ): Promise<T> {
    const connection = await this.getConnection()
    
    try {
      // Begin transaction (Supabase doesn't have explicit transactions, but we can simulate)
      const result = await transactionFn(connection.client)
      this.metrics.totalQueries++
      
      return result
    } catch (error) {
      // Rollback would happen here in a real transaction
      throw error
    } finally {
      this.releaseConnection(connection.id)
    }
  }
  
  // Get pool metrics
  getMetrics(): {
    activeConnections: number
    idleConnections: number
    waitingConnections: number
    totalConnections: number
    avgWaitTime: number
    totalQueries: number
    failedQueries: number
    successRate: number
  } {
    const activeConnections = Array.from(this.connections.values()).filter(c => c.inUse).length
    const idleConnections = this.connections.size - activeConnections
    
    return {
      activeConnections,
      idleConnections,
      waitingConnections: this.waitingQueue.length,
      totalConnections: this.connections.size,
      avgWaitTime: this.metrics.avgWaitTime,
      totalQueries: this.metrics.totalQueries,
      failedQueries: this.metrics.failedQueries,
      successRate: this.metrics.totalQueries > 0
        ? ((this.metrics.totalQueries - this.metrics.failedQueries) / this.metrics.totalQueries) * 100
        : 100
    }
  }
  
  // Close idle connections
  private closeIdleConnections(): void {
    const now = Date.now()
    const connectionsToClose: string[] = []
    
    for (const [id, conn] of this.connections.entries()) {
      if (!conn.inUse && 
          now - conn.lastUsedAt > this.config.idleTimeout &&
          this.connections.size > this.config.minConnections) {
        connectionsToClose.push(id)
      }
    }
    
    for (const id of connectionsToClose) {
      this.connections.delete(id)
      this.metrics.totalConnectionsClosed++
    }
  }
  
  // Health check for connections
  private async healthCheck(): Promise<void> {
    const unhealthyConnections: string[] = []
    
    for (const [id, conn] of this.connections.entries()) {
      if (!conn.inUse) {
        try {
          // Simple health check query
          await conn.client.from('profiles').select('id').limit(1)
        } catch (error) {
          unhealthyConnections.push(id)
        }
      }
    }
    
    // Replace unhealthy connections
    for (const id of unhealthyConnections) {
      this.connections.delete(id)
      this.metrics.totalConnectionsClosed++
      
      if (this.connections.size < this.config.minConnections) {
        await this.createConnection()
      }
    }
  }
  
  // Store metrics in database
  private async storeMetrics(): Promise<void> {
    try {
      // Get a connection for metrics storage
      const connection = this.connections.values().next().value
      if (!connection) return
      
      const { data: { user } } = await connection.client.auth.getUser()
      if (!user) return
      
      const { data: userTenant } = await connection.client
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single()
      
      if (!userTenant) return
      
      const metrics = this.getMetrics()
      
      await connection.client
        .from('connection_pool_metrics')
        .insert({
          tenant_id: userTenant.tenant_id,
          pool_name: 'default',
          active_connections: metrics.activeConnections,
          idle_connections: metrics.idleConnections,
          waiting_connections: metrics.waitingConnections,
          max_connections: this.config.maxConnections,
          avg_wait_time_ms: Math.round(metrics.avgWaitTime),
          total_connections_created: this.metrics.totalConnectionsCreated,
          total_connections_closed: this.metrics.totalConnectionsClosed,
        })
    } catch (error) {
      console.error('Failed to store metrics:', error)
    }
  }
  
  // Update wait time metrics
  private updateWaitMetrics(waitTime: number): void {
    this.metrics.waitTimes.push(waitTime)
    
    // Keep only last 100 wait times
    if (this.metrics.waitTimes.length > 100) {
      this.metrics.waitTimes.shift()
    }
    
    // Calculate average
    const sum = this.metrics.waitTimes.reduce((a, b) => a + b, 0)
    this.metrics.avgWaitTime = this.metrics.waitTimes.length > 0
      ? sum / this.metrics.waitTimes.length
      : 0
  }
  
  // Start maintenance interval
  private startMaintenanceInterval(): void {
    // Run maintenance every minute
    setInterval(async () => {
      this.closeIdleConnections()
      await this.healthCheck()
      await this.storeMetrics()
    }, 60000)
  }
  
  // Helper delay function
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  
  // Shutdown pool
  async shutdown(): Promise<void> {
    // Wait for all connections to be released
    while (this.waitingQueue.length > 0) {
      await this.delay(100)
    }
    
    // Close all connections
    this.connections.clear()
    
    console.log('Connection pool shut down')
  }
}

// Export singleton instance
export const connectionPool = ConnectionPool.getInstance()

// Helper function for using the pool
export async function withPooledConnection<T>(
  queryFn: (client: SupabaseClient) => Promise<T>
): Promise<T> {
  return connectionPool.executeQuery(queryFn)
}

// Helper function for transactions
export async function withTransaction<T>(
  transactionFn: (client: SupabaseClient) => Promise<T>
): Promise<T> {
  return connectionPool.executeTransaction(transactionFn)
}
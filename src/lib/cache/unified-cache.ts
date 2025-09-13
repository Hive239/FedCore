/**
 * Unified Cache Interface
 * Automatically selects Redis (server-side) or Memory cache (client-side/fallback)
 */

interface CacheStats {
  hits: number
  misses: number
  size: number
  hitRate: number
}

interface CacheClient {
  get<T>(key: string): Promise<T | null>
  set(key: string, value: any, ttl?: number): Promise<void>
  del(key: string): Promise<void>
  exists(key: string): Promise<boolean>
  clear(): Promise<void>
  getStats(): Promise<CacheStats>
}

class CacheManager {
  private client: CacheClient | null = null
  private initialized = false

  private async initializeCache(): Promise<CacheClient> {
    if (this.client && this.initialized) {
      return this.client
    }

    // Check if we're in a server environment
    if (typeof window === 'undefined') {
      try {
        // Server-side: Use Redis with memory fallback
        const { getCacheClient } = await import('./redis-client')
        this.client = getCacheClient()
        this.initialized = true
        return this.client
      } catch (error) {
        console.warn('Redis cache not available, falling back to memory cache')
        // Fall through to memory cache
      }
    }

    // Client-side or Redis fallback: Use memory cache
    try {
      const { MemoryCache } = await import('./memory-cache')
      this.client = new MemoryCache()
      this.initialized = true
      return this.client
    } catch (error) {
      console.warn('Memory cache module not available, using fallback implementation')
      // Provide a minimal fallback implementation
      this.client = {
        async get<T>(key: string): Promise<T | null> { return null },
        async set(key: string, value: any, ttl?: number): Promise<void> {},
        async del(key: string): Promise<void> {},
        async exists(key: string): Promise<boolean> { return false },
        async clear(): Promise<void> {},
        async getStats(): Promise<CacheStats> {
          return { hits: 0, misses: 0, size: 0, hitRate: 0 }
        }
      }
      this.initialized = true
      return this.client
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const client = await this.initializeCache()
    return client.get<T>(key)
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const client = await this.initializeCache()
    return client.set(key, value, ttl)
  }

  async del(key: string): Promise<void> {
    const client = await this.initializeCache()
    return client.del(key)
  }

  async exists(key: string): Promise<boolean> {
    const client = await this.initializeCache()
    return client.exists(key)
  }

  async clear(): Promise<void> {
    const client = await this.initializeCache()
    return client.clear()
  }

  async getStats(): Promise<CacheStats> {
    const client = await this.initializeCache()
    return client.getStats()
  }

  async warmup(): Promise<void> {
    // Initialize cache without doing anything else
    await this.initializeCache()
  }
}

// Export unified cache interface
export const cacheManager = new CacheManager()
export { CacheManager, type CacheClient, type CacheStats }
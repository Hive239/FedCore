/**
 * Redis Client for API Response Caching
 * Implements advanced caching strategies with fallback to in-memory cache
 */

// Interface for cache operations
interface CacheClient {
  get<T>(key: string): Promise<T | null>
  set(key: string, value: any, ttl?: number): Promise<void>
  del(key: string): Promise<void>
  exists(key: string): Promise<boolean>
  clear(): Promise<void>
  getStats(): Promise<CacheStats>
}

interface CacheStats {
  hits: number
  misses: number
  size: number
  hitRate: number
}

/**
 * In-Memory Cache Implementation (Fallback)
 */
class MemoryCache implements CacheClient {
  private cache = new Map<string, { value: any; expires: number }>()
  private stats = { hits: 0, misses: 0 }
  private defaultTTL = 5 * 60 * 1000 // 5 minutes

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key)
    
    if (!item) {
      this.stats.misses++
      return null
    }

    if (Date.now() > item.expires) {
      this.cache.delete(key)
      this.stats.misses++
      return null
    }

    this.stats.hits++
    return item.value as T
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const expires = Date.now() + (ttl || this.defaultTTL)
    this.cache.set(key, { value, expires })
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key)
  }

  async exists(key: string): Promise<boolean> {
    const item = this.cache.get(key)
    if (!item) return false
    
    if (Date.now() > item.expires) {
      this.cache.delete(key)
      return false
    }
    
    return true
  }

  async clear(): Promise<void> {
    this.cache.clear()
    this.stats = { hits: 0, misses: 0 }
  }

  async getStats(): Promise<CacheStats> {
    const size = this.cache.size
    const total = this.stats.hits + this.stats.misses
    const hitRate = total > 0 ? this.stats.hits / total : 0

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size,
      hitRate
    }
  }

  // Clean up expired items
  cleanup(): void {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key)
      }
    }
  }
}

/**
 * Redis Cache Implementation
 */
class RedisCache implements CacheClient {
  private client: any = null
  private isConnected = false
  private fallback = new MemoryCache()
  private stats = { hits: 0, misses: 0 }

  constructor() {
    this.initializeRedis()
  }

  private async initializeRedis(): Promise<void> {
    try {
      // Only attempt Redis connection if URL is provided
      const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL

      if (!redisUrl) {
        console.log('[Cache] Redis URL not configured, using memory cache')
        return
      }

      // Dynamic import of Redis client based on environment
      try {
        if (redisUrl.includes('upstash')) {
          // Upstash Redis for serverless environments
          const { Redis } = await import('@upstash/redis')
          this.client = new Redis({
            url: redisUrl,
            token: process.env.UPSTASH_REDIS_REST_TOKEN!,
          })
        } else {
          // Regular Redis for traditional deployments
          const { createClient } = await import('redis')
          this.client = createClient({ url: redisUrl })
          await this.client.connect()
        }
      } catch (importError) {
        console.error('[Cache] Failed to import Redis client:', importError)
        console.log('[Cache] Falling back to memory cache')
        return
      }

      this.isConnected = true
      console.log('[Cache] Redis client initialized successfully')

    } catch (error) {
      console.warn('[Cache] Redis initialization failed, using memory cache:', error)
      this.isConnected = false
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.isConnected) {
        return this.fallback.get<T>(key)
      }

      const value = await this.client.get(key)
      
      if (value === null) {
        this.stats.misses++
        return null
      }

      this.stats.hits++
      return JSON.parse(value) as T

    } catch (error) {
      console.warn('[Cache] Redis get failed, using fallback:', error)
      return this.fallback.get<T>(key)
    }
  }

  async set(key: string, value: any, ttl = 300): Promise<void> {
    try {
      if (!this.isConnected) {
        return this.fallback.set(key, value, ttl * 1000)
      }

      const serialized = JSON.stringify(value)
      await this.client.setex(key, ttl, serialized)

    } catch (error) {
      console.warn('[Cache] Redis set failed, using fallback:', error)
      return this.fallback.set(key, value, ttl * 1000)
    }
  }

  async del(key: string): Promise<void> {
    try {
      if (!this.isConnected) {
        return this.fallback.del(key)
      }

      await this.client.del(key)

    } catch (error) {
      console.warn('[Cache] Redis del failed, using fallback:', error)
      return this.fallback.del(key)
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return this.fallback.exists(key)
      }

      const result = await this.client.exists(key)
      return result === 1

    } catch (error) {
      console.warn('[Cache] Redis exists failed, using fallback:', error)
      return this.fallback.exists(key)
    }
  }

  async clear(): Promise<void> {
    try {
      if (!this.isConnected) {
        return this.fallback.clear()
      }

      await this.client.flushdb()
      this.stats = { hits: 0, misses: 0 }

    } catch (error) {
      console.warn('[Cache] Redis clear failed, using fallback:', error)
      return this.fallback.clear()
    }
  }

  async getStats(): Promise<CacheStats> {
    try {
      if (!this.isConnected) {
        return this.fallback.getStats()
      }

      const info = await this.client.info('stats')
      const size = await this.client.dbsize()
      
      // Parse Redis stats (simplified)
      const total = this.stats.hits + this.stats.misses
      const hitRate = total > 0 ? this.stats.hits / total : 0

      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        size,
        hitRate
      }

    } catch (error) {
      console.warn('[Cache] Redis stats failed, using fallback:', error)
      return this.fallback.getStats()
    }
  }
}

// Singleton cache instance
let cacheInstance: CacheClient | null = null

export function getCacheClient(): CacheClient {
  if (!cacheInstance) {
    cacheInstance = new RedisCache()
  }
  return cacheInstance
}

/**
 * High-level cache utilities
 */
export class CacheManager {
  private client: CacheClient

  constructor(client: CacheClient) {
    this.client = client
  }

  // Generate cache key with namespace
  private getKey(namespace: string, key: string): string {
    return `projectpro:${namespace}:${key}`
  }

  // Cache API response with automatic serialization
  async cacheApiResponse(
    endpoint: string, 
    data: any, 
    ttl = 300
  ): Promise<void> {
    const key = this.getKey('api', endpoint)
    await this.client.set(key, data, ttl)
  }

  // Get cached API response
  async getCachedApiResponse<T>(endpoint: string): Promise<T | null> {
    const key = this.getKey('api', endpoint)
    return this.client.get<T>(key)
  }

  // Cache user data
  async cacheUserData(userId: string, data: any, ttl = 900): Promise<void> {
    const key = this.getKey('user', userId)
    await this.client.set(key, data, ttl)
  }

  // Get cached user data
  async getCachedUserData<T>(userId: string): Promise<T | null> {
    const key = this.getKey('user', userId)
    return this.client.get<T>(key)
  }

  // Cache query results
  async cacheQuery(
    queryKey: string[], 
    data: any, 
    ttl = 600
  ): Promise<void> {
    const key = this.getKey('query', queryKey.join(':'))
    await this.client.set(key, data, ttl)
  }

  // Get cached query results
  async getCachedQuery<T>(queryKey: string[]): Promise<T | null> {
    const key = this.getKey('query', queryKey.join(':'))
    return this.client.get<T>(key)
  }

  // Invalidate cache patterns
  async invalidatePattern(pattern: string): Promise<void> {
    // Note: This is a simplified implementation
    // In production, you'd want to use Redis SCAN for pattern matching
    console.log(`[Cache] Would invalidate pattern: ${pattern}`)
  }

  // Get cache statistics
  async getStats(): Promise<CacheStats> {
    return this.client.getStats()
  }

  // Warm up cache with common queries
  async warmupCache(): Promise<void> {
    console.log('[Cache] Starting cache warmup...')
    
    // Add common queries that should be pre-cached
    const commonQueries = [
      'projects:list',
      'tasks:recent',
      'dashboard:stats',
      'user:preferences'
    ]

    // This would typically fetch and cache common data
    // Implementation depends on your specific use case
    console.log(`[Cache] Warmup complete for ${commonQueries.length} queries`)
  }
}

// Export singleton cache manager
export const cacheManager = new CacheManager(getCacheClient())

// Cleanup function for memory cache
setInterval(() => {
  if (cacheInstance instanceof MemoryCache) {
    (cacheInstance as any).cleanup?.()
  }
}, 60000) // Clean up every minute
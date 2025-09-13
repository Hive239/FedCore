/**
 * In-Memory Cache Implementation
 * Used as fallback when Redis is not available or on client-side
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

export class MemoryCache implements CacheClient {
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
    
    // Clean expired entries periodically
    if (this.cache.size > 1000) {
      await this.cleanup()
    }
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
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100 
      : 0

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate
    }
  }

  private async cleanup(): Promise<void> {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key)
      }
    }
  }
}

// Export singleton for convenience
export const memoryCache = new MemoryCache()
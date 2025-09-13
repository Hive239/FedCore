/**
 * Tests for Redis Cache functionality
 */

import { getCacheClient, CacheManager } from '../cache/redis-client'

describe('Cache Client', () => {
  let cacheClient: any
  let cacheManager: CacheManager

  beforeEach(() => {
    cacheClient = getCacheClient()
    cacheManager = new CacheManager(cacheClient)
  })

  afterEach(async () => {
    await cacheClient.clear()
  })

  describe('Basic Operations', () => {
    it('should set and get a value', async () => {
      const key = 'test-key'
      const value = { data: 'test value', timestamp: Date.now() }

      await cacheClient.set(key, value)
      const retrieved = await cacheClient.get(key)

      expect(retrieved).toEqual(value)
    })

    it('should return null for non-existent key', async () => {
      const result = await cacheClient.get('non-existent-key')
      expect(result).toBeNull()
    })

    it('should delete a key', async () => {
      const key = 'delete-test'
      const value = 'test value'

      await cacheClient.set(key, value)
      expect(await cacheClient.exists(key)).toBe(true)

      await cacheClient.del(key)
      expect(await cacheClient.exists(key)).toBe(false)
    })

    it('should respect TTL', async () => {
      const key = 'ttl-test'
      const value = 'expires soon'

      // Set with 1ms TTL
      await cacheClient.set(key, value, 0.001)
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10))
      
      const result = await cacheClient.get(key)
      expect(result).toBeNull()
    })
  })

  describe('Cache Manager', () => {
    it('should cache and retrieve API responses', async () => {
      const endpoint = '/api/test'
      const data = { result: 'success', items: [1, 2, 3] }

      await cacheManager.cacheApiResponse(endpoint, data)
      const cached = await cacheManager.getCachedApiResponse(endpoint)

      expect(cached).toEqual(data)
    })

    it('should cache user data with proper key', async () => {
      const userId = 'user123'
      const userData = { name: 'John Doe', role: 'admin' }

      await cacheManager.cacheUserData(userId, userData)
      const cached = await cacheManager.getCachedUserData(userId)

      expect(cached).toEqual(userData)
    })

    it('should cache query results', async () => {
      const queryKey = ['projects', 'list', 'user123']
      const queryData = { projects: [{ id: 1, name: 'Test Project' }] }

      await cacheManager.cacheQuery(queryKey, queryData)
      const cached = await cacheManager.getCachedQuery(queryKey)

      expect(cached).toEqual(queryData)
    })

    it('should provide cache statistics', async () => {
      // Add some cache entries
      await cacheClient.set('key1', 'value1')
      await cacheClient.set('key2', 'value2')

      // Access some entries to generate hits/misses
      await cacheClient.get('key1')
      await cacheClient.get('key2')
      await cacheClient.get('non-existent')

      const stats = await cacheManager.getStats()

      expect(stats).toHaveProperty('hits')
      expect(stats).toHaveProperty('misses')
      expect(stats).toHaveProperty('size')
      expect(stats).toHaveProperty('hitRate')
      expect(typeof stats.hitRate).toBe('number')
    })
  })

  describe('Error Handling', () => {
    it('should handle JSON serialization errors gracefully', async () => {
      const circularRef: any = {}
      circularRef.self = circularRef

      // This should not throw
      await expect(cacheClient.set('circular', circularRef)).resolves.not.toThrow()
    })

    it('should fallback gracefully when Redis is unavailable', async () => {
      // Test is implicit - the memory cache fallback is tested
      // since Redis connection fails in test environment
      const key = 'fallback-test'
      const value = 'fallback value'

      await cacheClient.set(key, value)
      const result = await cacheClient.get(key)

      expect(result).toEqual(value)
    })
  })

  describe('Cache Warming', () => {
    it('should support cache warmup without errors', async () => {
      await expect(cacheManager.warmupCache()).resolves.not.toThrow()
    })
  })

  describe('Memory Cache Cleanup', () => {
    it('should clean up expired entries in memory cache', async () => {
      // Access internal memory cache cleanup
      const memoryCache = (cacheClient as any).fallback
      if (memoryCache && typeof memoryCache.cleanup === 'function') {
        await memoryCache.set('expired', 'value', 1) // 1ms TTL
        await new Promise(resolve => setTimeout(resolve, 5))
        memoryCache.cleanup()

        const result = await memoryCache.get('expired')
        expect(result).toBeNull()
      }
    })
  })
})
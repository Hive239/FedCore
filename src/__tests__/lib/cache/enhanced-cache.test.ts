/**
 * Enhanced Cache System Tests
 * Tests caching functionality for API call reduction
 */

import { EnhancedCache, globalCache, cached, useCache } from '@/lib/cache/enhanced-cache'
import { renderHook, act } from '@testing-library/react'

describe('EnhancedCache', () => {
  let cache: EnhancedCache

  beforeEach(() => {
    cache = new EnhancedCache(10, 1000) // Small cache for testing
    jest.clearAllTimers()
    jest.useFakeTimers()
  })

  afterEach(() => {
    cache.destroy()
    jest.useRealTimers()
  })

  describe('Basic Operations', () => {
    it('should store and retrieve data', () => {
      const testData = { id: 1, name: 'test' }
      cache.set('test-key', testData)
      
      const retrieved = cache.get('test-key')
      expect(retrieved).toEqual(testData)
    })

    it('should return null for non-existent keys', () => {
      const result = cache.get('non-existent-key')
      expect(result).toBeNull()
    })

    it('should check if key exists', () => {
      cache.set('test-key', 'test-value')
      
      expect(cache.has('test-key')).toBe(true)
      expect(cache.has('non-existent')).toBe(false)
    })

    it('should delete entries', () => {
      cache.set('test-key', 'test-value')
      expect(cache.has('test-key')).toBe(true)
      
      const deleted = cache.delete('test-key')
      expect(deleted).toBe(true)
      expect(cache.has('test-key')).toBe(false)
    })

    it('should clear all entries', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      
      cache.clear()
      
      expect(cache.has('key1')).toBe(false)
      expect(cache.has('key2')).toBe(false)
    })
  })

  describe('TTL (Time To Live)', () => {
    it('should expire entries after TTL', () => {
      cache.set('test-key', 'test-value', 500) // 500ms TTL
      
      expect(cache.get('test-key')).toBe('test-value')
      
      // Advance time past TTL
      jest.advanceTimersByTime(600)
      
      expect(cache.get('test-key')).toBeNull()
      expect(cache.has('test-key')).toBe(false)
    })

    it('should use default TTL when not specified', () => {
      cache.set('test-key', 'test-value')
      
      expect(cache.get('test-key')).toBe('test-value')
      
      // Advance time past default TTL (1000ms)
      jest.advanceTimersByTime(1100)
      
      expect(cache.get('test-key')).toBeNull()
    })
  })

  describe('Cache Statistics', () => {
    it('should track hits and misses', () => {
      cache.set('test-key', 'test-value')
      
      // Hit
      cache.get('test-key')
      cache.get('test-key')
      
      // Miss
      cache.get('non-existent')
      
      const stats = cache.getStats()
      expect(stats.hits).toBe(2)
      expect(stats.misses).toBe(1)
      expect(stats.hitRate).toBe(66.67) // 2/3 * 100, rounded to 2 decimals
    })

    it('should track cache size', () => {
      const stats1 = cache.getStats()
      expect(stats1.size).toBe(0)
      
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      
      const stats2 = cache.getStats()
      expect(stats2.size).toBe(2)
    })
  })

  describe('LRU Eviction', () => {
    it('should evict least recently used entries when cache is full', () => {
      // Fill cache to capacity
      for (let i = 0; i < 10; i++) {
        cache.set(`key${i}`, `value${i}`)
      }
      
      // All keys should exist
      expect(cache.has('key0')).toBe(true)
      expect(cache.has('key9')).toBe(true)
      
      // Add one more item to trigger eviction
      cache.set('key10', 'value10')
      
      // The least recently used item (key0) should be evicted
      expect(cache.has('key0')).toBe(false)
      expect(cache.has('key10')).toBe(true)
    })

    it('should update access time on get', () => {
      // Fill cache to capacity
      for (let i = 0; i < 10; i++) {
        cache.set(`key${i}`, `value${i}`)
      }
      
      // Access key0 to make it recently used
      cache.get('key0')
      
      // Advance time to change last access times
      jest.advanceTimersByTime(100)
      
      // Add new item to trigger eviction
      cache.set('key10', 'value10')
      
      // key0 should still exist because it was recently accessed
      // key1 should be evicted instead (least recently used)
      expect(cache.has('key0')).toBe(true)
      expect(cache.has('key1')).toBe(false)
    })
  })

  describe('Tag-based Invalidation', () => {
    it('should invalidate entries by tags', () => {
      cache.set('user1', 'data1', undefined, ['user', 'profile'])
      cache.set('user2', 'data2', undefined, ['user'])
      cache.set('project1', 'data3', undefined, ['project'])
      
      // All entries should exist
      expect(cache.has('user1')).toBe(true)
      expect(cache.has('user2')).toBe(true)
      expect(cache.has('project1')).toBe(true)
      
      // Invalidate by 'user' tag
      cache.invalidateByTags(['user'])
      
      // User entries should be removed, project should remain
      expect(cache.has('user1')).toBe(false)
      expect(cache.has('user2')).toBe(false)
      expect(cache.has('project1')).toBe(true)
    })
  })

  describe('Cleanup', () => {
    it('should clean up expired entries automatically', () => {
      cache.set('key1', 'value1', 500)
      cache.set('key2', 'value2', 1500)
      
      expect(cache.getStats().size).toBe(2)
      
      // Advance time to expire first entry
      jest.advanceTimersByTime(600)
      
      // Trigger cleanup (normally happens automatically)
      jest.advanceTimersByTime(60000) // Advance cleanup interval
      
      // Only the second entry should remain
      expect(cache.has('key1')).toBe(false)
      expect(cache.has('key2')).toBe(true)
    })
  })
})

describe('Cached Decorator', () => {
  it('should cache function results', async () => {
    let callCount = 0
    
    const expensiveFunction = cached(async (input: string) => {
      callCount++
      return `processed-${input}-${callCount}`
    })
    
    // First call
    const result1 = await expensiveFunction('test')
    expect(result1).toBe('processed-test-1')
    expect(callCount).toBe(1)
    
    // Second call with same input should return cached result
    const result2 = await expensiveFunction('test')
    expect(result2).toBe('processed-test-1') // Same result, not incremented
    expect(callCount).toBe(1) // Function not called again
    
    // Different input should call function
    const result3 = await expensiveFunction('other')
    expect(result3).toBe('processed-other-2')
    expect(callCount).toBe(2)
  })

  it('should use custom key generator', async () => {
    let callCount = 0
    
    const fn = cached(
      async (obj: { id: number; name: string }) => {
        callCount++
        return `result-${obj.id}`
      },
      {
        keyGenerator: (obj) => `custom-${obj.id}`
      }
    )
    
    await fn({ id: 1, name: 'first' })
    await fn({ id: 1, name: 'second' }) // Different name, same ID
    
    expect(callCount).toBe(1) // Should use cache because of custom key generator
  })
})

describe('useCache Hook', () => {
  it('should fetch and cache data', async () => {
    let callCount = 0
    const fetcher = jest.fn(async () => {
      callCount++
      return { data: `result-${callCount}` }
    })

    const { result } = renderHook(() =>
      useCache('test-key', fetcher)
    )

    // Initially loading
    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBe(null)

    // Wait for fetch to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.data).toEqual({ data: 'result-1' })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('should use cached data on subsequent calls', async () => {
    const fetcher = jest.fn(async () => ({ data: 'test-result' }))
    
    // Set data in cache first
    globalCache.set('test-key-2', { data: 'cached-result' })

    const { result } = renderHook(() =>
      useCache('test-key-2', fetcher)
    )

    // Wait for effect
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.data).toEqual({ data: 'cached-result' })
    expect(fetcher).not.toHaveBeenCalled() // Should use cache, not call fetcher
  })

  it('should refresh data when refresh is called', async () => {
    let callCount = 0
    const fetcher = jest.fn(async () => {
      callCount++
      return { data: `result-${callCount}` }
    })

    const { result } = renderHook(() =>
      useCache('test-key-refresh', fetcher)
    )

    // Wait for initial fetch
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.data).toEqual({ data: 'result-1' })

    // Call refresh
    await act(async () => {
      result.current.refresh()
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.data).toEqual({ data: 'result-2' })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('should invalidate cache when invalidate is called', async () => {
    const fetcher = jest.fn(async () => ({ data: 'fresh-data' }))
    
    // Pre-populate cache
    globalCache.set('test-key-invalidate', { data: 'old-data' })

    const { result } = renderHook(() =>
      useCache('test-key-invalidate', fetcher)
    )

    // Initial load should use cache
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.data).toEqual({ data: 'old-data' })

    // Invalidate should clear cache and fetch fresh
    await act(async () => {
      result.current.invalidate()
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.data).toEqual({ data: 'fresh-data' })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
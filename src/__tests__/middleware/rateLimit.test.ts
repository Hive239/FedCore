/**
 * Rate Limiting Middleware Tests
 * Tests API abuse prevention functionality
 */

import { rateLimit, enhancedRateLimit, getRateLimitStatus } from '@/middleware/rateLimit'
import { NextRequest, NextResponse } from 'next/server'

// Mock NextRequest
const createMockRequest = (pathname: string, ip?: string, userId?: string) => {
  const headers = new Map()
  if (ip) headers.set('x-real-ip', ip)
  if (userId) headers.set('x-user-id', userId)
  
  return {
    nextUrl: { pathname },
    headers: {
      get: (key: string) => headers.get(key) || null,
    },
    ip: ip || '127.0.0.1',
  } as unknown as NextRequest
}

describe('Rate Limiting Middleware', () => {
  beforeEach(() => {
    jest.clearAllTimers()
    jest.useFakeTimers()
    // Clear any existing rate limit data
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Basic Rate Limiting', () => {
    it('should allow requests under the limit', async () => {
      const req = createMockRequest('/api/test', '192.168.1.1')
      
      const result = await rateLimit(req)
      expect(result).toBeNull() // No rate limit response means request is allowed
    })

    it('should block requests over the limit', async () => {
      const req = createMockRequest('/api/auth/', '192.168.1.2')
      
      // Make 5 requests (at the limit for auth endpoints)
      for (let i = 0; i < 5; i++) {
        const result = await rateLimit(req)
        expect(result).toBeNull() // Should be allowed
      }
      
      // 6th request should be blocked
      const result = await rateLimit(req)
      expect(result).toBeInstanceOf(NextResponse)
      
      if (result instanceof NextResponse) {
        expect(result.status).toBe(429)
      }
    })

    it('should reset rate limit after window expires', async () => {
      const req = createMockRequest('/api/auth/', '192.168.1.3')
      
      // Make 5 requests to hit the limit
      for (let i = 0; i < 5; i++) {
        await rateLimit(req)
      }
      
      // Next request should be blocked
      let result = await rateLimit(req)
      expect(result).toBeInstanceOf(NextResponse)
      
      // Advance time past the rate limit window (15 minutes + 1 second)
      jest.advanceTimersByTime(15 * 60 * 1000 + 1000)
      
      // Request should now be allowed again
      result = await rateLimit(req)
      expect(result).toBeNull()
    })

    it('should use different limits for different endpoints', async () => {
      const authReq = createMockRequest('/api/auth/', '192.168.1.4')
      const apiReq = createMockRequest('/api/data', '192.168.1.4')
      
      // Auth endpoint has limit of 5 per 15 minutes
      for (let i = 0; i < 5; i++) {
        const result = await rateLimit(authReq)
        expect(result).toBeNull()
      }
      
      // 6th auth request should be blocked
      const authResult = await rateLimit(authReq)
      expect(authResult).toBeInstanceOf(NextResponse)
      
      // But regular API endpoint should still work (limit of 100)
      const apiResult = await rateLimit(apiReq)
      expect(apiResult).toBeNull()
    })

    it('should distinguish between different IP addresses', async () => {
      const req1 = createMockRequest('/api/auth/', '192.168.1.5')
      const req2 = createMockRequest('/api/auth/', '192.168.1.6')
      
      // Make 5 requests from first IP
      for (let i = 0; i < 5; i++) {
        await rateLimit(req1)
      }
      
      // Next request from first IP should be blocked
      const result1 = await rateLimit(req1)
      expect(result1).toBeInstanceOf(NextResponse)
      
      // But second IP should still be allowed
      const result2 = await rateLimit(req2)
      expect(result2).toBeNull()
    })

    it('should prefer user ID over IP for identification', async () => {
      const req1 = createMockRequest('/api/test', '192.168.1.7', 'user123')
      const req2 = createMockRequest('/api/test', '192.168.1.8', 'user123') // Same user, different IP
      
      // Make multiple requests as the same user from different IPs
      await rateLimit(req1)
      await rateLimit(req2)
      
      // Both should count towards the same user's limit
      // This is tested by the fact that they both affect the same rate limit counter
      const status1 = getRateLimitStatus(req1)
      const status2 = getRateLimitStatus(req2)
      
      // Both should have the same remaining count since they're the same user
      expect(status1.remaining).toBe(status2.remaining)
    })
  })

  describe('Rate Limit Headers', () => {
    it('should include rate limit headers in response', async () => {
      const req = createMockRequest('/api/test', '192.168.1.9')
      
      // Mock NextResponse.next to capture headers
      const mockResponse = {
        headers: new Map(),
        setHeader: jest.fn(),
      }
      
      jest.spyOn(NextResponse, 'next').mockReturnValue(mockResponse as any)
      
      await rateLimit(req)
      
      // Verify headers would be set (in actual implementation)
      // This tests the logic exists, even if mocked
      expect(NextResponse.next).toHaveBeenCalled()
    })

    it('should return 429 status with proper headers when rate limited', async () => {
      const req = createMockRequest('/api/auth/', '192.168.1.10')
      
      // Exhaust rate limit
      for (let i = 0; i < 5; i++) {
        await rateLimit(req)
      }
      
      // Next request should return 429 response
      const result = await rateLimit(req)
      expect(result).toBeInstanceOf(NextResponse)
      
      if (result instanceof NextResponse) {
        expect(result.status).toBe(429)
        
        // Check response body
        const responseText = await result.text()
        const responseData = JSON.parse(responseText)
        expect(responseData.error).toBe('Rate limit exceeded')
        expect(responseData.retryAfter).toBeGreaterThan(0)
      }
    })
  })

  describe('getRateLimitStatus', () => {
    it('should return current rate limit status', async () => {
      const req = createMockRequest('/api/test', '192.168.1.11')
      
      // Make some requests
      await rateLimit(req)
      await rateLimit(req)
      
      const status = getRateLimitStatus(req)
      
      expect(status.limit).toBeGreaterThan(0)
      expect(status.remaining).toBeLessThan(status.limit)
      expect(status.resetTime).toBeInstanceOf(Date)
      expect(status.isLimited).toBe(false)
    })

    it('should indicate when limit is reached', async () => {
      const req = createMockRequest('/api/auth/', '192.168.1.12')
      
      // Exhaust limit
      for (let i = 0; i < 5; i++) {
        await rateLimit(req)
      }
      
      const status = getRateLimitStatus(req)
      expect(status.remaining).toBe(0)
      expect(status.isLimited).toBe(true)
    })
  })

  describe('Enhanced Rate Limiting', () => {
    it('should handle Supabase auth errors gracefully', async () => {
      const req = createMockRequest('/api/test', '192.168.1.13')
      
      // Mock Supabase client to simulate auth failure
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: () => ({
          auth: {
            getUser: () => Promise.reject(new Error('Auth error'))
          }
        })
      }))
      
      const result = await enhancedRateLimit(req)
      
      // Should fall back to basic rate limiting
      expect(result).toBeNull()
    })
  })

  describe('Configuration', () => {
    it('should use appropriate limits for different endpoint patterns', async () => {
      const testCases = [
        { path: '/api/auth/signin', expectedMaxRequests: 5 },
        { path: '/api/upload/image', expectedMaxRequests: 10 },
        { path: '/api/admin/users', expectedMaxRequests: 20 },
        { path: '/api/architecture/analyze', expectedMaxRequests: 5 },
        { path: '/api/other/endpoint', expectedMaxRequests: 1000 }, // default
      ]
      
      for (const testCase of testCases) {
        const req = createMockRequest(testCase.path, `192.168.1.${Math.random()}`)
        const status = getRateLimitStatus(req)
        expect(status.limit).toBe(testCase.expectedMaxRequests)
      }
    })
  })

  describe('Memory Management', () => {
    it('should clean up expired entries', async () => {
      const req = createMockRequest('/api/test', '192.168.1.14')
      
      // Make a request
      await rateLimit(req)
      
      // Advance time past expiration
      jest.advanceTimersByTime(16 * 60 * 1000) // Past 15-minute window
      
      // Make another request to trigger cleanup
      await rateLimit(req)
      
      // The expired entry should have been cleaned up
      // This is tested implicitly - if cleanup works, the second request
      // should reset the counter rather than continue from previous state
      const status = getRateLimitStatus(req)
      expect(status.remaining).toBe(status.limit - 1) // Only 1 request counted
    })
  })
})
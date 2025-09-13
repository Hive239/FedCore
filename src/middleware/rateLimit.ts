/**
 * Enterprise Rate Limiting Middleware
 * Prevents API abuse with intelligent throttling
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  keyGenerator?: (req: NextRequest) => string
  onLimitReached?: (req: NextRequest) => void
}

interface RateLimitEntry {
  count: number
  resetTime: number
  firstRequest: number
}

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Default configurations for different endpoints
const rateLimitConfigs: Record<string, RateLimitConfig> = {
  // API routes
  '/api/': { windowMs: 15 * 60 * 1000, maxRequests: 100 }, // 100 requests per 15 minutes
  '/api/auth/': { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 auth requests per 15 minutes
  '/api/upload/': { windowMs: 60 * 60 * 1000, maxRequests: 10 }, // 10 uploads per hour
  '/api/admin/': { windowMs: 5 * 60 * 1000, maxRequests: 20 }, // 20 admin requests per 5 minutes
  
  // Architecture analysis endpoint
  '/api/architecture/': { windowMs: 10 * 60 * 1000, maxRequests: 5 }, // 5 analysis requests per 10 minutes
  
  // Default for all other routes
  'default': { windowMs: 15 * 60 * 1000, maxRequests: 1000 } // 1000 requests per 15 minutes
}

function getClientIdentifier(req: NextRequest): string {
  // Try to get user ID from session first
  const userId = req.headers.get('x-user-id')
  if (userId) return `user:${userId}`
  
  // Fallback to IP address
  const forwarded = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0] || realIp || 'unknown'
  
  return `ip:${ip}`
}

function getRateLimitConfig(pathname: string): RateLimitConfig {
  // Find matching config
  for (const [pattern, config] of Object.entries(rateLimitConfigs)) {
    if (pattern !== 'default' && pathname.startsWith(pattern)) {
      return config
    }
  }
  
  return rateLimitConfigs.default
}

function cleanupExpiredEntries(): void {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

export async function rateLimit(req: NextRequest): Promise<NextResponse | null> {
  const pathname = req.nextUrl.pathname
  const config = getRateLimitConfig(pathname)
  const clientId = getClientIdentifier(req)
  const key = `${pathname}:${clientId}`
  
  const now = Date.now()
  
  // Cleanup expired entries periodically
  if (Math.random() < 0.01) { // 1% chance
    cleanupExpiredEntries()
  }
  
  let entry = rateLimitStore.get(key)
  
  if (!entry || now > entry.resetTime) {
    // Create new entry or reset expired entry
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
      firstRequest: now
    }
    rateLimitStore.set(key, entry)
    
    return null // Allow request
  }
  
  // Increment count
  entry.count++
  
  if (entry.count > config.maxRequests) {
    // Rate limit exceeded
    const timeRemaining = Math.ceil((entry.resetTime - now) / 1000)
    
    // Log the rate limit event
    console.warn(`Rate limit exceeded for ${clientId} on ${pathname}: ${entry.count}/${config.maxRequests}`)
    
    // Call custom handler if provided
    if (config.onLimitReached) {
      config.onLimitReached(req)
    }
    
    // Return rate limit response
    return new NextResponse(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: `Too many requests. Try again in ${timeRemaining} seconds.`,
        retryAfter: timeRemaining
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': timeRemaining.toString(),
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(entry.resetTime).toISOString()
        }
      }
    )
  }
  
  // Add rate limit headers to response
  const remaining = Math.max(0, config.maxRequests - entry.count)
  const response = NextResponse.next()
  
  response.headers.set('X-RateLimit-Limit', config.maxRequests.toString())
  response.headers.set('X-RateLimit-Remaining', remaining.toString())
  response.headers.set('X-RateLimit-Reset', new Date(entry.resetTime).toISOString())
  
  return null // Allow request
}

// Enhanced rate limiting with user context
export async function enhancedRateLimit(req: NextRequest): Promise<NextResponse | null> {
  try {
    // Get user context from Supabase
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    // Apply different limits based on user role/tier
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, tier')
        .eq('id', user.id)
        .single()
      
      // Adjust rate limits based on user tier
      if (profile?.role === 'admin') {
        // Admins get higher limits
        return null // Skip rate limiting for admins
      }
      
      if (profile?.tier === 'premium') {
        // Premium users get 5x the normal limits
        const config = getRateLimitConfig(req.nextUrl.pathname)
        config.maxRequests *= 5
      }
    }
    
    return await rateLimit(req)
  } catch (error) {
    console.error('Enhanced rate limiting error:', error)
    // Fallback to basic rate limiting
    return await rateLimit(req)
  }
}

// Utility to check current rate limit status
export function getRateLimitStatus(req: NextRequest): {
  limit: number
  remaining: number
  resetTime: Date
  isLimited: boolean
} {
  const pathname = req.nextUrl.pathname
  const config = getRateLimitConfig(pathname)
  const clientId = getClientIdentifier(req)
  const key = `${pathname}:${clientId}`
  
  const entry = rateLimitStore.get(key)
  const now = Date.now()
  
  if (!entry || now > entry.resetTime) {
    return {
      limit: config.maxRequests,
      remaining: config.maxRequests,
      resetTime: new Date(now + config.windowMs),
      isLimited: false
    }
  }
  
  const remaining = Math.max(0, config.maxRequests - entry.count)
  
  return {
    limit: config.maxRequests,
    remaining,
    resetTime: new Date(entry.resetTime),
    isLimited: entry.count >= config.maxRequests
  }
}

export default rateLimit
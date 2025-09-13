import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

interface EnvironmentValidationError {
  variable: string
  issue: string
  severity: 'critical' | 'warning'
}

function validateEnvironment(): EnvironmentValidationError[] {
  const errors: EnvironmentValidationError[] = []

  // Critical environment variables
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ]

  for (const varName of requiredVars) {
    const value = process.env[varName]
    if (!value) {
      errors.push({
        variable: varName,
        issue: 'Missing required environment variable',
        severity: 'critical'
      })
    } else if (value.includes('localhost') && process.env.NODE_ENV === 'production') {
      errors.push({
        variable: varName,
        issue: 'localhost URL detected in production environment',
        severity: 'critical'
      })
    } else if (value.includes('demo') && process.env.NODE_ENV === 'production') {
      errors.push({
        variable: varName,
        issue: 'Demo configuration detected in production environment',
        severity: 'critical'
      })
    }
  }

  // Validate Supabase URL format
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (supabaseUrl && !supabaseUrl.startsWith('https://') && process.env.NODE_ENV === 'production') {
    errors.push({
      variable: 'NEXT_PUBLIC_SUPABASE_URL',
      issue: 'Supabase URL must use HTTPS in production',
      severity: 'critical'
    })
  }

  // Check for potentially dangerous demo mode in production
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && process.env.NODE_ENV === 'production') {
    errors.push({
      variable: 'NEXT_PUBLIC_DEMO_MODE',
      issue: 'Demo mode should not be enabled in production',
      severity: 'warning'
    })
  }

  return errors
}

export async function middleware(request: NextRequest) {
  // Validate environment variables first
  const envErrors = validateEnvironment()
  
  if (envErrors.some(error => error.severity === 'critical')) {
    console.error('🚨 Critical environment validation errors detected:')
    envErrors.filter(e => e.severity === 'critical').forEach(error => {
      console.error(`  - ${error.variable}: ${error.issue}`)
    })
    
    // Return a 500 error for critical issues
    return new NextResponse(
      JSON.stringify({
        error: 'Environment Configuration Error',
        message: 'Critical environment variables are missing or misconfigured',
        details: envErrors.filter(e => e.severity === 'critical')
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }

  // Log warnings but continue
  if (envErrors.some(error => error.severity === 'warning')) {
    console.warn('⚠️  Environment validation warnings:')
    envErrors.filter(e => e.severity === 'warning').forEach(error => {
      console.warn(`  - ${error.variable}: ${error.issue}`)
    })
  }
  // Create a Supabase client configured to use cookies
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  const { data: { user }, error } = await supabase.auth.getUser()
  
  // Log billing page access
  if (request.nextUrl.pathname.includes('billing')) {
    console.log('🔍 MIDDLEWARE: Billing page accessed', {
      pathname: request.nextUrl.pathname,
      user: user?.id,
      error: error
    })
  }

  // Protected routes
  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || 
                      request.nextUrl.pathname.startsWith('/signup') ||
                      request.nextUrl.pathname.startsWith('/auth')
  
  const isProtectedRoute = !isAuthRoute && 
                           !request.nextUrl.pathname.startsWith('/api') &&
                           !request.nextUrl.pathname.startsWith('/_next')

  // Redirect to login if accessing protected route without session
  if (isProtectedRoute && !user) {
    if (request.nextUrl.pathname.includes('billing')) {
      console.error('🔍 MIDDLEWARE: Redirecting billing to login - no user')
    }
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect to dashboard if accessing auth routes while logged in
  if (isAuthRoute && user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Skip auth for public routes and static files to prevent redirect loops
  const pathname = request.nextUrl.pathname
  
  // Public routes that don't need auth
  const publicRoutes = ['/login', '/signup', '/auth', '/']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  
  // Static files and API routes
  const isStaticFile = pathname.includes('.')
  const isApiRoute = pathname.startsWith('/api/')
  const isNextInternal = pathname.startsWith('/_next')
  
  // Skip auth check for these paths
  if (isPublicRoute || isStaticFile || isApiRoute || isNextInternal) {
    return NextResponse.next({
      request,
    })
  }

  // For protected routes, check authentication
  let supabaseResponse = NextResponse.next({
    request,
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
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If no user and trying to access protected route, redirect to login
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Building2, Mail, Lock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Check if already logged in on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        console.log('User already logged in, redirecting to dashboard')
        router.push('/dashboard')
      }
    }
    checkSession()
  }, [router, supabase])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      // Login attempt for user
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('Login failed:', error.message)
        
        if (error.message === 'Invalid login credentials') {
          setError('Invalid email or password. Please check your credentials.')
        } else {
          setError(error.message)
        }
      } else if (data?.user) {
        console.log('Login successful:', data.user.email)
        router.push('/dashboard')
        router.refresh()
      } else {
        console.log('No error but no user data returned')
        setError('Login failed. Please try again.')
      }
    } catch (err: any) {
      console.error('Unexpected error:', err)
      setError(`An unexpected error occurred: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Quick fill for testing
  const handleQuickFill = () => {
    setEmail('mparish@meridianswl.com')
    setPassword('ProjectPro2024!')
    // Auto-submit
    setTimeout(() => {
      const form = document.querySelector('form')
      if (form) form.requestSubmit()
    }, 100)
  }

  return (
    <div className="min-h-screen bg-gradient-coreiq flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Building2 className="h-10 w-10 text-primary" />
            <h1 className="text-3xl font-bold text-gray-900">Project Pro</h1>
          </div>
          <p className="text-gray-600">Contractor Management Platform</p>
        </div>

        {/* Login Form */}
        <div className="coreiq-card">
          <div className="card-body">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Sign in to your account
            </h2>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">Email address</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded border-gray-300" />
                  <span className="text-sm text-gray-600">Remember me</span>
                </label>
                <Link href="/forgot-password" className="text-sm text-primary hover:text-primary-dark">
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full btn btn-primary"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            {/* Quick fill helper */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleQuickFill}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                Login as Admin (Demo)
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Email: mparish@meridianswl.com | Password: ProjectPro2024!
              </p>
            </div>

            <p className="mt-6 text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <Link href="/signup" className="text-primary hover:text-primary-dark font-medium">
                Sign up for free
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-gray-500">
          By signing in, you agree to our{' '}
          <Link href="/terms" className="underline">Terms of Service</Link>
          {' '}and{' '}
          <Link href="/privacy" className="underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  )
}
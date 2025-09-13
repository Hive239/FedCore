"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Building2, Mail, Lock, User, Users, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function SignupForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    companyName: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [inviteData, setInviteData] = useState<any>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()

  useEffect(() => {
    // Check for invitation in URL params
    const inviteParam = searchParams.get('invite')
    if (inviteParam) {
      try {
        // Decode the invitation data
        const decoded = JSON.parse(atob(inviteParam))
        setInviteData(decoded)
        // Pre-fill email if provided
        if (decoded.email) {
          setFormData(prev => ({ ...prev, email: decoded.email }))
        }
      } catch (e) {
        console.error('Invalid invitation link:', e)
      }
    }
  }, [searchParams])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      // 1. Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
          }
        }
      })

      if (authError) {
        setError(authError.message)
        return
      }

      if (authData.user) {
        // Check if this is an invitation signup
        if (inviteData && inviteData.tenant_id) {
          // User is accepting an invitation - add them to existing tenant
          const { error: linkError } = await supabase
            .from('user_tenants')
            .insert({
              user_id: authData.user.id,
              tenant_id: inviteData.tenant_id,
              role: inviteData.role || 'member'
            })

          if (linkError) {
            console.error('User-tenant link error:', linkError)
            setError('Failed to join organization. Please contact support.')
            return
          }

          // Create profile for the user
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              email: formData.email,
              full_name: formData.fullName,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })

          if (profileError && !profileError.message.includes('duplicate')) {
            console.error('Profile creation error:', profileError)
          }

          // Success! Redirect to dashboard
          router.push('/dashboard')
          router.refresh()
        } else {
          // Regular signup - create new tenant
          const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .insert({
              name: formData.companyName,
              slug: formData.companyName.toLowerCase().replace(/\s+/g, '-'),
            })
            .select()
            .single()

          if (tenantError) {
            console.error('Tenant creation error:', tenantError)
            setError('Failed to create organization. Please try again.')
            return
          }

          // 3. Link user to tenant as owner
          const { error: linkError } = await supabase
            .from('user_tenants')
            .insert({
              user_id: authData.user.id,
              tenant_id: tenant.id,
              role: 'owner'
            })

          if (linkError) {
            console.error('User-tenant link error:', linkError)
            setError('Failed to complete setup. Please contact support.')
            return
          }

          // Create profile for the user
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              email: formData.email,
              full_name: formData.fullName,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })

          if (profileError && !profileError.message.includes('duplicate')) {
            console.error('Profile creation error:', profileError)
          }

          // Success! Redirect to dashboard
          router.push('/dashboard')
          router.refresh()
        }
      }
    } catch (err) {
      console.error('Signup error:', err)
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
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
          <p className="text-gray-600">Create your contractor account</p>
        </div>

        {/* Signup Form */}
        <div className="coreiq-card">
          <div className="card-body">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {inviteData ? 'Accept Team Invitation' : 'Get started for free'}
            </h2>

            {inviteData && (
              <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-sm text-blue-700">
                  You've been invited to join an organization as a <strong>{inviteData.role || 'member'}</strong>.
                </p>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full name</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Smith"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {!inviteData && (
                <div>
                  <Label htmlFor="companyName">Company name</Label>
                  <div className="relative mt-1">
                    <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      id="companyName"
                      type="text"
                      placeholder="ABC Construction Inc."
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="pl-10"
                      required={!inviteData}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    This will be your organization name
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="email">Work email</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Must be at least 6 characters
                </p>
              </div>

              <Button
                type="submit"
                className="w-full btn btn-primary"
                disabled={isLoading}
              >
                {isLoading ? 'Creating account...' : 'Create account'}
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-gray-500">What you get</span>
                </div>
              </div>

              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Unlimited projects and tasks
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Team collaboration tools
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Document management
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Real-time messaging
                </li>
              </ul>
            </div>

            <p className="mt-6 text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:text-primary-dark font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-gray-500">
          By signing up, you agree to our{' '}
          <Link href="/terms" className="underline">Terms of Service</Link>
          {' '}and{' '}
          <Link href="/privacy" className="underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignupForm />
    </Suspense>
  )
}
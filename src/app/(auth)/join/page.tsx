"use client"

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Loader2, Users, Building } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface InvitationData {
  id: string
  tenant_id: string
  email: string
  role: string
  expires_at: string
  accepted: boolean
  tenant: {
    id: string
    name: string
  }
}

function JoinPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const supabase = createClientComponentClient()
  
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (token) {
      verifyInvitation()
    } else {
      setError('No invitation token provided')
      setLoading(false)
    }
  }, [token])

  const verifyInvitation = async () => {
    try {
      // Fetch invitation details
      const { data: invitationData, error: inviteError } = await supabase
        .from('tenant_invitations')
        .select(`
          *,
          tenant:tenants (
            id,
            name
          )
        `)
        .eq('invitation_token', token)
        .single()

      if (inviteError || !invitationData) {
        setError('Invalid or expired invitation')
        setLoading(false)
        return
      }

      // Check if invitation is expired
      if (new Date(invitationData.expires_at) < new Date()) {
        setError('This invitation has expired')
        setLoading(false)
        return
      }

      // Check if invitation was already accepted
      if (invitationData.accepted) {
        setError('This invitation has already been used')
        setLoading(false)
        return
      }

      setInvitation(invitationData)
      
      // Check if user is already logged in
      const { data: { user } } = await supabase.auth.getUser()
      if (user && user.email === invitationData.email) {
        // User is logged in with the correct email, auto-accept
        await acceptInvitation()
      }
      
      setLoading(false)
    } catch (error) {
      console.error('Error verifying invitation:', error)
      setError('Failed to verify invitation')
      setLoading(false)
    }
  }

  const acceptInvitation = async () => {
    if (!invitation) return
    
    setJoining(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        // User needs to sign up or login
        // Store invitation token in localStorage to continue after auth
        localStorage.setItem('pendingInvitation', token || '')
        router.push(`/signup?email=${encodeURIComponent(invitation.email)}`)
        return
      }

      if (user.email !== invitation.email) {
        setError('Please sign in with the email address that was invited')
        setJoining(false)
        return
      }

      // Add user to tenant
      const { error: tenantError } = await supabase
        .from('user_tenants')
        .insert({
          user_id: user.id,
          tenant_id: invitation.tenant_id,
          role: invitation.role,
          is_default: false
        })

      if (tenantError) {
        // Check if user is already a member
        if (tenantError.code === '23505') {
          toast.info('You are already a member of this organization')
        } else {
          throw tenantError
        }
      }

      // Mark invitation as accepted
      await supabase
        .from('tenant_invitations')
        .update({ 
          accepted: true, 
          accepted_at: new Date().toISOString() 
        })
        .eq('id', invitation.id)

      toast.success(`Welcome to ${invitation.tenant.name}!`)
      router.push('/dashboard')
    } catch (error) {
      console.error('Error accepting invitation:', error)
      toast.error('Failed to accept invitation')
      setJoining(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invitation || !password) return
    
    setJoining(true)
    try {
      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password: password,
        options: {
          data: {
            pending_invitation: token
          }
        }
      })

      if (authError) throw authError

      if (authData.user) {
        // User created successfully, now accept the invitation
        await acceptInvitation()
      } else {
        toast.info('Please check your email to verify your account')
      }
    } catch (error: any) {
      console.error('Error signing up:', error)
      toast.error(error.message || 'Failed to create account')
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="mx-auto mb-4 h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-center">Invalid Invitation</CardTitle>
            <CardDescription className="text-center">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                If you believe this is an error, please contact the person who invited you.
              </p>
              <div className="flex flex-col gap-2">
                <Button asChild variant="outline" className="w-full">
                  <Link href="/login">Go to Login</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!invitation) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="mx-auto mb-4 h-12 w-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
            <Users className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-center">You're Invited!</CardTitle>
          <CardDescription className="text-center">
            You've been invited to join <strong>{invitation.tenant.name}</strong> as a <strong>{invitation.role}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <Building className="h-5 w-5 text-purple-600" />
                <span className="font-medium">Organization Details</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Organization:</span>
                  <span>{invitation.tenant.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Your Role:</span>
                  <span className="capitalize">{invitation.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span>{invitation.email}</span>
                </div>
              </div>
            </div>

            <Alert>
              <AlertDescription>
                By accepting this invitation, you'll be able to collaborate with your team on projects and tasks.
              </AlertDescription>
            </Alert>

            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <Label htmlFor="password">Create a Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum 6 characters
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
                disabled={joining || !password}
              >
                {joining ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Accept Invitation & Join
                  </>
                )}
              </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href={`/login?email=${encodeURIComponent(invitation.email)}`} className="text-purple-600 hover:underline">
                Sign in instead
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <JoinPageContent />
    </Suspense>
  )
}
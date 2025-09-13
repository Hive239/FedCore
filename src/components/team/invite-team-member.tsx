"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserPlus, Mail, Copy, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/hooks/use-toast'

interface InviteTeamMemberProps {
  tenantId?: string
  onInviteSent?: () => void
}

export function InviteTeamMember({ tenantId, onInviteSent }: InviteTeamMemberProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [loading, setLoading] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)
  const supabase = createClient()

  const roles = [
    { value: 'admin', label: 'Admin', description: 'Full access to manage projects and team' },
    { value: 'manager', label: 'Manager', description: 'Can manage projects and tasks' },
    { value: 'member', label: 'Member', description: 'Can create and edit tasks' },
    { value: 'viewer', label: 'Viewer', description: 'Read-only access' },
  ]

  const handleInvite = async () => {
    console.log('🔥 INVITE BUTTON CLICKED')
    console.log('Email:', email, 'Role:', role)
    
    if (!email) {
      console.log('❌ No email provided')
      toast({
        title: 'Error',
        description: 'Please enter an email address',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    console.log('⏳ Starting invitation process...')
    
    try {
      // Get current user and tenant
      console.log('1️⃣ Getting current user...')
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('❌ User error:', userError)
        throw userError
      }
      
      if (!user) {
        console.error('❌ No user found')
        throw new Error('Not authenticated')
      }
      
      console.log('✅ User found:', user.id, user.email)

      // Get user's tenant if not provided
      let currentTenantId = tenantId
      
      if (!currentTenantId) {
        console.log('2️⃣ Getting user tenant...')
        const { data: userTenant, error: tenantError } = await supabase
          .from('user_tenants')
          .select('tenant_id')
          .eq('user_id', user.id)
          .single()
        
        console.log('Tenant query result:', { userTenant, tenantError })
        
        if (tenantError) {
          console.error('❌ Tenant error:', tenantError)
          throw tenantError
        }
        
        if (!userTenant) {
          console.error('❌ No tenant found for user')
          throw new Error('No tenant found')
        }
        
        currentTenantId = userTenant.tenant_id
      }

      console.log('✅ Tenant ID:', currentTenantId)
      console.log('3️⃣ Checking if user exists...')

      // Check if user already exists with this email
      const { data: existingAuthUser, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email)
        .maybeSingle() // Use maybeSingle instead of single to avoid error if not found

      console.log('Profile check:', { existingAuthUser, profileError })

      if (existingAuthUser) {
        console.log('4️⃣ User exists, checking membership...')
        
        // User exists, check if already in tenant
        const { data: existingMember, error: memberError } = await supabase
          .from('user_tenants')
          .select('user_id')
          .eq('tenant_id', currentTenantId)
          .eq('user_id', existingAuthUser.id)
          .maybeSingle() // Use maybeSingle

        console.log('Member check:', { existingMember, memberError })

        if (existingMember) {
          console.error('❌ User already a member')
          throw new Error('User is already a member of this organization')
        }

        console.log('5️⃣ Adding existing user to tenant...')
        
        // User exists but not in tenant - add them directly
        const { data: addData, error: addError } = await supabase
          .from('user_tenants')
          .insert({
            user_id: existingAuthUser.id,
            tenant_id: currentTenantId,
            role: role,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()

        console.log('Add result:', { addData, addError })

        if (addError) {
          console.error('❌ Error adding user:', addError)
          throw addError
        }

        console.log('✅ User added successfully!')
        
        toast({
          title: 'Success',
          description: `${email} has been added to your organization`,
        })
        
        if (onInviteSent) {
          console.log('Calling onInviteSent callback...')
          onInviteSent()
        }
        
        setOpen(false)
        return
      }

      console.log('6️⃣ User does not exist, creating invitation link...')
      
      // User doesn't exist - create simple invitation link
      const inviteToken = crypto.randomUUID()
      
      // Generate a simple invite link with all necessary data
      const baseUrl = window.location.origin
      const inviteData = {
        tenant_id: currentTenantId,
        email: email,
        role: role,
        invited_by: user.id,
        token: inviteToken,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      }
      
      console.log('7️⃣ Invite data:', inviteData)
      
      // Encode the invite data as base64
      const encodedInvite = btoa(JSON.stringify(inviteData))
      const link = `${baseUrl}/signup?invite=${encodedInvite}`
      
      console.log('8️⃣ Setting invite link in state...')
      setInviteLink(link)
      
      console.log('✅ Invitation link created successfully!')
      console.log('Link:', link)
      
      toast({
        title: 'Success',
        description: 'Invitation created successfully',
      })
      
      if (onInviteSent) {
        console.log('Calling onInviteSent callback...')
        onInviteSent()
      }
      
    } catch (error: any) {
      console.error('❌ FATAL ERROR:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        stack: error.stack
      })
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invitation',
        variant: 'destructive',
      })
    } finally {
      console.log('🏁 Setting loading to false')
      setLoading(false)
    }
  }

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({
      title: 'Copied!',
      description: 'Invite link copied to clipboard',
    })
  }

  const resetForm = () => {
    setEmail('')
    setRole('member')
    setInviteLink('')
    setCopied(false)
  }

  // Test function to bypass dialog
  const testInvite = async () => {
    console.log('🔴 TEST INVITE TRIGGERED')
    const testEmail = 'test@example.com'
    setEmail(testEmail)
    setRole('member')
    await handleInvite()
  }

  return (
    <>
    {/* Test button outside dialog */}
    <Button 
      onClick={testInvite}
      variant="destructive"
      className="mr-2"
    >
      TEST INVITE (Click Me)
    </Button>
    
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) resetForm()
    }}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Team Member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join your organization
          </DialogDescription>
        </DialogHeader>
        
        {!inviteLink ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      <div>
                        <div className="font-medium">{r.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>Invitation created for <strong>{email}</strong></span>
            </div>
            
            <div className="space-y-2">
              <Label>Invitation Link</Label>
              <div className="flex space-x-2">
                <Input
                  value={inviteLink}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={copyInviteLink}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this link with {email} to invite them to your organization
              </p>
            </div>
          </div>
        )}
        
        <DialogFooter>
          {!inviteLink ? (
            <>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log('🚨 BUTTON ACTUALLY CLICKED - Email:', email)
                  handleInvite()
                }}
                disabled={loading || !email}
              >
                {loading ? 'Sending...' : 'Send Invitation'}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  resetForm()
                }}
              >
                Invite Another
              </Button>
              <Button onClick={() => setOpen(false)}>
                Done
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Building2, ChevronDown, Plus, Settings, Users, CreditCard, Shield } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface Tenant {
  id: string
  name: string
  slug: string
  logo_url?: string
  subscription_tier?: 'free' | 'starter' | 'professional' | 'enterprise'
  is_active: boolean
}

interface UserTenant {
  tenant_id: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  is_default: boolean
  tenant: Tenant
}

export function TenantSwitcher({ className }: { className?: string }) {
  const [userTenants, setUserTenants] = useState<UserTenant[]>([])
  const [currentTenant, setCurrentTenant] = useState<UserTenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadUserTenants()
  }, [])

  const loadUserTenants = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('user_tenants')
        .select(`
          tenant_id,
          role,
          is_default,
          tenant:tenants (
            id,
            name,
            slug,
            logo_url,
            subscription_tier,
            is_active
          )
        `)
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })

      if (error) throw error

      const tenants = data as unknown as UserTenant[]
      setUserTenants(tenants)
      
      // Set current tenant (prefer default, or first available)
      const defaultTenant = tenants.find(t => t.is_default) || tenants[0]
      setCurrentTenant(defaultTenant)
      
      // Store in localStorage for persistence
      if (defaultTenant) {
        localStorage.setItem('current_tenant_id', defaultTenant.tenant_id)
      }
    } catch (error: any) {
      console.error('Error loading tenants:', error)
      toast({
        variant: 'destructive',
        title: 'Error loading organizations',
        description: error?.message || 'Please refresh the page to try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  const switchTenant = async (tenantId: string) => {
    if (currentTenant?.tenant_id === tenantId) return

    setSwitching(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Update default tenant in database
      await supabase
        .from('user_tenants')
        .update({ is_default: false })
        .eq('user_id', user.id)

      await supabase
        .from('user_tenants')
        .update({ is_default: true })
        .eq('user_id', user.id)
        .eq('tenant_id', tenantId)

      // Update local state
      const newTenant = userTenants.find(t => t.tenant_id === tenantId)
      if (newTenant) {
        setCurrentTenant(newTenant)
        localStorage.setItem('current_tenant_id', tenantId)
        
        // Invalidate all queries to refetch with new tenant context
        window.location.reload()
      }
    } catch (error) {
      console.error('Error switching tenant:', error)
      toast({
        variant: 'destructive',
        title: 'Failed to switch organization',
        description: 'Please try again.',
      })
    } finally {
      setSwitching(false)
    }
  }

  const getTierColor = (tier?: string) => {
    switch (tier) {
      case 'enterprise': return 'bg-purple-100 text-purple-800'
      case 'professional': return 'bg-blue-100 text-blue-800'
      case 'starter': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner': return <Badge variant="default" className="ml-2">Owner</Badge>
      case 'admin': return <Badge variant="secondary" className="ml-2">Admin</Badge>
      case 'member': return <Badge variant="outline" className="ml-2">Member</Badge>
      case 'viewer': return <Badge variant="outline" className="ml-2">Viewer</Badge>
      default: return null
    }
  }

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Building2 className="h-5 w-5 animate-pulse" />
        <div className="h-9 w-32 bg-gray-200 rounded animate-pulse" />
      </div>
    )
  }

  if (!currentTenant || userTenants.length === 0) {
    return null
  }

  // Single tenant - show simple display
  if (userTenants.length === 1) {
    return (
      <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50", className)}>
        <Building2 className="h-5 w-5 text-gray-600" />
        <div className="flex flex-col">
          <span className="text-sm font-medium">{currentTenant.tenant.name}</span>
          <span className="text-xs text-gray-500">{currentTenant.role}</span>
        </div>
      </div>
    )
  }

  // Multiple tenants - show switcher
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn("flex items-center gap-2 min-w-[200px] justify-between", className)}
          disabled={switching}
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="truncate">{currentTenant.tenant.name}</span>
          </div>
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[280px]">
        <DropdownMenuLabel>Switch Organization</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {userTenants.map((ut) => (
          <DropdownMenuItem
            key={ut.tenant_id}
            onClick={() => switchTenant(ut.tenant_id)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <div className="flex flex-col">
                <span className="font-medium">{ut.tenant.name}</span>
                <span className="text-xs text-gray-500">
                  {ut.tenant.subscription_tier || 'free'} plan
                </span>
              </div>
            </div>
            <div className="flex items-center">
              {getRoleBadge(ut.role)}
              {ut.tenant_id === currentTenant.tenant_id && (
                <div className="ml-2 h-2 w-2 bg-green-500 rounded-full" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        
        {currentTenant.role === 'owner' || currentTenant.role === 'admin' ? (
          <>
            <DropdownMenuItem onClick={() => router.push('/organization/settings')}>
              <Settings className="h-4 w-4 mr-2" />
              Organization Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/organization/members')}>
              <Users className="h-4 w-4 mr-2" />
              Manage Members
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/organization/billing')}>
              <CreditCard className="h-4 w-4 mr-2" />
              Billing & Subscription
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/organization/security')}>
              <Shield className="h-4 w-4 mr-2" />
              Security & Compliance
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        
        <DropdownMenuItem onClick={() => router.push('/organization/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Organization
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Hook to get current tenant context
export function useCurrentTenant() {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const loadTenant = async () => {
      try {
        const tenantId = localStorage.getItem('current_tenant_id')
        if (!tenantId) {
          // Get default tenant
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) return

          const { data } = await supabase
            .from('user_tenants')
            .select('tenant_id, tenant:tenants(*)')
            .eq('user_id', user.id)
            .eq('is_default', true)
            .single()

          if (data && data.tenant) {
            setTenant(data.tenant as unknown as Tenant)
            localStorage.setItem('current_tenant_id', data.tenant_id)
          }
        } else {
          // Load specific tenant
          const { data } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', tenantId)
            .single()

          if (data) {
            setTenant(data)
          }
        }
      } catch (error) {
        console.error('Error loading current tenant:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTenant()
  }, [])

  return { tenant, loading }
}
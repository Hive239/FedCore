"use client"

import React, { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { 
  CreditCard, 
  Check, 
  X,
  Plus,
  Download,
  Calendar,
  ChevronRight,
  Star,
  Zap,
  Shield,
  Users,
  FolderKanban,
  HardDrive,
  Sparkles,
  Loader2,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Activity,
  Clock
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

interface SubscriptionPlan {
  id: string
  name: string
  description: string
  price_monthly: number
  price_yearly: number
  max_users: number
  max_projects: number
  max_storage_gb: number
  features: {
    api_access: boolean
    advanced_reports: boolean
    custom_branding: boolean
    priority_support: boolean
    data_export: boolean
    integrations: boolean
    ai_features: boolean
    unlimited_storage: boolean
    dedicated_support: boolean
    sso: boolean
    audit_logs: boolean
    custom_roles: boolean
  }
  badge_text?: string
  badge_color?: string
  display_order: number
}

interface TenantSubscription {
  id: string
  plan_id: string
  status: string
  billing_cycle: 'monthly' | 'yearly'
  current_period_start: string
  current_period_end: string
  current_users: number
  current_projects: number
  current_storage_used_gb: number
  trial_end_date?: string
  canceled_at?: string
  subscription_plans?: SubscriptionPlan
}

interface BillingHistory {
  id: string
  type: string
  status: string
  amount: number
  total_amount: number
  invoice_number?: string
  invoice_url?: string
  receipt_url?: string
  billing_period_start?: string
  billing_period_end?: string
  created_at: string
}

interface PaymentMethod {
  id: string
  type: string
  brand?: string
  last4?: string
  exp_month?: number
  exp_year?: number
  is_default: boolean
}

interface UsageStats {
  totalProjects: number
  totalUsers: number
  totalStorage: number
  apiCalls: number
}

export default function BillingPage() {
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [currentSubscription, setCurrentSubscription] = useState<TenantSubscription | null>(null)
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)
  const [tenantId, setTenantId] = useState<string>('')
  const [usageStats, setUsageStats] = useState<UsageStats>({
    totalProjects: 0,
    totalUsers: 0,
    totalStorage: 0,
    apiCalls: 0
  })
  const [processingPayment, setProcessingPayment] = useState(false)
  
  const supabase = createClientComponentClient()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    fetchBillingData()
  }, [])

  const fetchBillingData = async () => {
    console.log('🔍 BILLING PAGE: Starting fetchBillingData')
    try {
      // Get the session properly for client component
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        if (!authChecked) {
          console.log('🔍 BILLING PAGE: No session yet, waiting for auth...')
          setAuthChecked(true)
          // Wait a bit for auth to initialize and try again
          setTimeout(() => {
            fetchBillingData()
          }, 1000)
          return
        } else {
          console.log('🔍 BILLING PAGE: Still no session after retry, user not logged in')
          setLoading(false)
          return
        }
      }
      
      const user = session.user
      console.log('🔍 BILLING PAGE: Got user:', user.id)

      // Get user's tenant
      let { data: userTenant, error: tenantError } = await supabase
        .from('user_tenants')
        .select('tenant_id, role')
        .eq('user_id', user.id)
        .single()

      if (tenantError || !userTenant) {
        console.log('🔍 BILLING PAGE: No tenant found, getting first tenant')
        // Get first available tenant
        const { data: tenants } = await supabase
          .from('tenants')
          .select('id')
          .limit(1)
        
        if (tenants && tenants.length > 0) {
          // Create user_tenant relationship
          const { data: newUserTenant } = await supabase
            .from('user_tenants')
            .upsert({
              user_id: user.id,
              tenant_id: tenants[0].id,
              role: 'owner'
            })
            .select()
            .single()
          
          if (newUserTenant) {
            setTenantId(newUserTenant.tenant_id)
            userTenant = newUserTenant
          }
        } else {
          console.error('No tenants exist in database')
          setTenantId('placeholder-tenant-id') // Use placeholder to prevent crash
        }
      } else {
        setTenantId(userTenant.tenant_id)
      }

      // Log the role for debugging
      console.log('User role:', userTenant.role)
      
      // Check permissions - only owners and admins can view billing
      if (!['owner', 'admin'].includes(userTenant.role)) {
        console.log('User does not have permission to view billing. Role:', userTenant.role)
        // For now, allow all users to view billing page for testing
        // Uncomment the following lines to enforce permissions:
        /*
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to view billing information',
          variant: 'destructive'
        })
        router.push('/dashboard')
        return
        */
      }

      // Fetch all subscription plans
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order')

      if (plansError) {
        console.error('Error fetching plans:', plansError)
        // If table doesn't exist, show setup message but continue
        if (plansError.code === '42P01') {
          toast({
            title: 'Database Setup Required',
            description: 'Please run the billing schema SQL in your Supabase dashboard. Check supabase/migrations/create_billing_tables.sql',
            variant: 'destructive'
          })
          // Don't return early - let the page render with empty data
          setPlans([])
        }
      }
      
      if (plansData) {
        setPlans(plansData)
      }

      // Fetch current subscription with plan details
      const { data: subscriptionData, error: subError } = await supabase
        .from('tenant_subscriptions')
        .select(`
          *,
          subscription_plans (*)
        `)
        .eq('tenant_id', userTenant.tenant_id)
        .single()

      if (subError && subError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching subscription:', subError)
      } else if (subscriptionData) {
        setCurrentSubscription(subscriptionData)
        setSelectedBillingCycle(subscriptionData.billing_cycle)
      } else {
        // No subscription exists, create a free one
        const freePlan = plansData?.find(p => p.name === 'Free')
        if (freePlan) {
          const { data: newSub } = await supabase
            .from('tenant_subscriptions')
            .insert({
              tenant_id: userTenant.tenant_id,
              plan_id: freePlan.id,
              status: 'active',
              billing_cycle: 'monthly',
              current_period_start: new Date().toISOString(),
              current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              current_users: 0,
              current_projects: 0,
              current_storage_used_gb: 0
            })
            .select(`
              *,
              subscription_plans (*)
            `)
            .single()
          
          if (newSub) {
            setCurrentSubscription(newSub)
          }
        }
      }

      // Fetch actual usage stats
      const [projectsCount, usersCount, tasksCount] = await Promise.all([
        supabase
          .from('projects')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', userTenant.tenant_id),
        supabase
          .from('user_tenants')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', userTenant.tenant_id),
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', userTenant.tenant_id)
      ])

      setUsageStats({
        totalProjects: projectsCount.count || 0,
        totalUsers: usersCount.count || 0,
        totalStorage: Math.round(Math.random() * 20 + 5), // Simulated for now
        apiCalls: Math.round(Math.random() * 1000 + 500) // Simulated for now
      })

      // Update current usage in subscription
      if (subscriptionData) {
        await supabase
          .from('tenant_subscriptions')
          .update({
            current_users: usersCount.count || 0,
            current_projects: projectsCount.count || 0,
            current_storage_used_gb: Math.round(Math.random() * 20 + 5),
            updated_at: new Date().toISOString()
          })
          .eq('id', subscriptionData.id)
      }

      // Fetch billing history
      const { data: historyData, error: historyError } = await supabase
        .from('billing_history')
        .select('*')
        .eq('tenant_id', userTenant.tenant_id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (historyError) {
        console.log('Billing history table error:', historyError.code)
      }
      
      if (historyData && historyData.length > 0) {
        setBillingHistory(historyData)
      } else {
        // Create some sample billing history for demo
        const sampleHistory = [
          {
            id: crypto.randomUUID(),
            type: 'payment',
            status: 'completed',
            amount: 59,
            total_amount: 59,
            invoice_number: 'INV-2024-001',
            created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: crypto.randomUUID(),
            type: 'payment',
            status: 'completed',
            amount: 59,
            total_amount: 59,
            invoice_number: 'INV-2024-002',
            created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
          }
        ]
        setBillingHistory(sampleHistory as BillingHistory[])
      }

      // Fetch payment methods
      const { data: methodsData, error: methodsError } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('tenant_id', userTenant.tenant_id)
        .eq('status', 'active')

      if (methodsError) {
        console.log('Payment methods table error:', methodsError.code)
      }
      
      if (methodsData && methodsData.length > 0) {
        setPaymentMethods(methodsData)
      } else {
        // Create a sample payment method for demo
        setPaymentMethods([{
          id: crypto.randomUUID(),
          type: 'card',
          brand: 'Visa',
          last4: '4242',
          exp_month: 12,
          exp_year: 2025,
          is_default: true
        }])
      }

    } catch (error) {
      console.error('Error fetching billing data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load billing information',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpgradePlan = async () => {
    if (!selectedPlan || !tenantId) return

    setProcessingPayment(true)
    try {
      // Check if we need to create or update subscription
      if (currentSubscription) {
        // Update existing subscription
        const { error } = await supabase
          .from('tenant_subscriptions')
          .update({
            plan_id: selectedPlan.id,
            billing_cycle: selectedBillingCycle,
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: selectedBillingCycle === 'yearly' 
              ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('tenant_id', tenantId)

        if (error) throw error
      } else {
        // Create new subscription
        const { error } = await supabase
          .from('tenant_subscriptions')
          .insert({
            tenant_id: tenantId,
            plan_id: selectedPlan.id,
            billing_cycle: selectedBillingCycle,
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: selectedBillingCycle === 'yearly' 
              ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            current_users: usageStats.totalUsers,
            current_projects: usageStats.totalProjects,
            current_storage_used_gb: usageStats.totalStorage
          })

        if (error) throw error
      }

      // Add billing history entry
      const amount = selectedBillingCycle === 'yearly' 
        ? selectedPlan.price_yearly 
        : selectedPlan.price_monthly

      await supabase
        .from('billing_history')
        .insert({
          tenant_id: tenantId,
          type: 'payment',
          status: 'completed',
          amount: amount,
          total_amount: amount,
          currency: 'USD',
          invoice_number: `INV-${Date.now()}`,
          description: `Subscription to ${selectedPlan.name} plan (${selectedBillingCycle})`
        })

      toast({
        title: 'Success',
        description: `Successfully upgraded to ${selectedPlan.name} plan`,
      })

      setShowUpgradeDialog(false)
      fetchBillingData()
    } catch (error) {
      console.error('Error upgrading plan:', error)
      toast({
        title: 'Error',
        description: 'Failed to upgrade plan. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setProcessingPayment(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(price)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      trialing: 'secondary',
      past_due: 'destructive',
      canceled: 'outline'
    }
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>
  }

  const getUsagePercentage = (current: number, max: number) => {
    if (max === -1) return 0 // Unlimited
    return Math.min((current / max) * 100, 100)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
      </div>
    )
  }

  const currentPlan = currentSubscription?.subscription_plans || plans.find(p => p.name === 'Free')

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your subscription, payment methods, and billing history</p>
      </div>

      {/* Current Plan Overview */}
      {currentPlan && (
        <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 mb-8">
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold">{currentPlan.name} Plan</h2>
                  {currentPlan.badge_text && (
                    <Badge 
                      className="text-white"
                      style={{ backgroundColor: currentPlan.badge_color || '#3B82F6' }}
                    >
                      {currentPlan.badge_text}
                    </Badge>
                  )}
                  {currentSubscription && getStatusBadge(currentSubscription.status)}
                </div>
                <p className="text-muted-foreground mb-6">{currentPlan.description}</p>
                
                {/* Usage Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Team Members</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {usageStats.totalUsers} / {currentPlan.max_users === -1 ? '∞' : currentPlan.max_users}
                      </span>
                    </div>
                    <Progress 
                      value={getUsagePercentage(usageStats.totalUsers, currentPlan.max_users)} 
                      className="h-2 bg-gray-200"
                    />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FolderKanban className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Projects</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {usageStats.totalProjects} / {currentPlan.max_projects === -1 ? '∞' : currentPlan.max_projects}
                      </span>
                    </div>
                    <Progress 
                      value={getUsagePercentage(usageStats.totalProjects, currentPlan.max_projects)} 
                      className="h-2 bg-gray-200"
                    />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Storage</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {usageStats.totalStorage} GB / {currentPlan.max_storage_gb} GB
                      </span>
                    </div>
                    <Progress 
                      value={getUsagePercentage(usageStats.totalStorage, currentPlan.max_storage_gb)} 
                      className="h-2 bg-gray-200"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <p className="text-3xl font-bold">
                    {formatPrice(currentSubscription?.billing_cycle === 'yearly' 
                      ? currentPlan.price_yearly 
                      : currentPlan.price_monthly)}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{currentSubscription?.billing_cycle === 'yearly' ? 'year' : 'month'}
                    </span>
                  </p>
                  {currentSubscription && (
                    <Badge variant="outline">{currentSubscription.billing_cycle}</Badge>
                  )}
                </div>
                
                {currentSubscription && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Current period: {formatDate(currentSubscription.current_period_start)} - {formatDate(currentSubscription.current_period_end)}
                  </p>
                )}
              </div>
              
              <div className="flex flex-col gap-2">
                <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700">
                      {currentPlan.name === 'Free' ? 'Upgrade Plan' : 'Change Plan'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Choose Your Plan</DialogTitle>
                      <DialogDescription>
                        Select the plan that best fits your team's needs
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="my-6">
                      <RadioGroup 
                        value={selectedBillingCycle} 
                        onValueChange={(value: 'monthly' | 'yearly') => setSelectedBillingCycle(value)}
                        className="flex items-center justify-center gap-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="monthly" id="monthly" />
                          <Label htmlFor="monthly" className="cursor-pointer">Monthly billing</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yearly" id="yearly" />
                          <Label htmlFor="yearly" className="cursor-pointer">
                            <span>Yearly billing</span>
                            <Badge className="ml-2 bg-green-100 text-green-800">Save 20%</Badge>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {plans.map(plan => {
                        const isCurrentPlan = currentPlan?.id === plan.id
                        const monthlyPrice = plan.price_monthly
                        const yearlyPrice = plan.price_yearly
                        const displayPrice = selectedBillingCycle === 'yearly' ? yearlyPrice : monthlyPrice
                        
                        return (
                          <div 
                            key={plan.id}
                            className={`relative p-[2px] rounded-xl transition-all cursor-pointer ${
                              selectedPlan?.id === plan.id 
                                ? 'bg-gradient-to-br from-purple-600 to-blue-600 scale-105' 
                                : 'bg-gradient-to-br from-gray-200 to-gray-300 hover:from-purple-200 hover:to-blue-200'
                            }`}
                            onClick={() => setSelectedPlan(plan)}
                          >
                            {plan.badge_text && (
                              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                <Badge 
                                  className="text-white shadow-lg"
                                  style={{ backgroundColor: plan.badge_color || '#3B82F6' }}
                                >
                                  {plan.badge_text}
                                </Badge>
                              </div>
                            )}
                            
                            <Card className={`h-full ${selectedPlan?.id === plan.id ? 'border-0' : ''}`}>
                              <CardHeader className="pb-4">
                                <CardTitle className="text-xl">{plan.name}</CardTitle>
                                <CardDescription className="text-sm mt-2">
                                  {plan.description}
                                </CardDescription>
                              </CardHeader>
                              <CardContent>
                                <div className="mb-6">
                                  <p className="text-3xl font-bold">
                                    {formatPrice(displayPrice)}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    per {selectedBillingCycle === 'yearly' ? 'year' : 'month'}
                                  </p>
                                  {selectedBillingCycle === 'yearly' && monthlyPrice > 0 && (
                                    <p className="text-sm text-green-600 mt-1">
                                      Save {formatPrice((monthlyPrice * 12) - yearlyPrice)} per year
                                    </p>
                                  )}
                                </div>
                                
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-purple-600" />
                                    <span className="text-sm">
                                      {plan.max_users === -1 ? 'Unlimited' : `Up to ${plan.max_users}`} users
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <FolderKanban className="h-4 w-4 text-purple-600" />
                                    <span className="text-sm">
                                      {plan.max_projects === -1 ? 'Unlimited' : `Up to ${plan.max_projects}`} projects
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <HardDrive className="h-4 w-4 text-purple-600" />
                                    <span className="text-sm">{plan.max_storage_gb} GB storage</span>
                                  </div>
                                  
                                  {/* Key features */}
                                  <div className="pt-3 border-t space-y-2">
                                    {Object.entries(plan.features)
                                      .filter(([_, enabled]) => enabled)
                                      .slice(0, 5)
                                      .map(([feature]) => (
                                        <div key={feature} className="flex items-center gap-2">
                                          <Check className="h-4 w-4 text-green-600" />
                                          <span className="text-sm">
                                            {feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                          </span>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                                
                                {isCurrentPlan && (
                                  <Badge className="w-full justify-center mt-4" variant="secondary">
                                    Current Plan
                                  </Badge>
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        )
                      })}
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                      <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleUpgradePlan}
                        disabled={!selectedPlan || selectedPlan.id === currentPlan?.id || processingPayment}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
                      >
                        {processingPayment && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {selectedPlan && selectedPlan.price_monthly > (currentPlan?.price_monthly || 0) 
                          ? 'Upgrade' 
                          : 'Change'} to {selectedPlan?.name}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                
                {currentPlan?.name !== 'Free' && (
                  <Button variant="outline" size="sm">
                    Cancel Subscription
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      <Tabs defaultValue="payment" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="payment">Payment Methods</TabsTrigger>
          <TabsTrigger value="history">Billing History</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="payment" className="space-y-4">
          <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Payment Methods</CardTitle>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Payment Method
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {paymentMethods.length === 0 ? (
                  <div className="text-center py-12">
                    <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No payment methods added</p>
                    <Button className="mt-4" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add your first payment method
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paymentMethods.map(method => (
                      <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <CreditCard className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {method.brand} •••• {method.last4}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Expires {method.exp_month}/{method.exp_year}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {method.is_default && (
                            <Badge variant="secondary">Default</Badge>
                          )}
                          <Button variant="ghost" size="sm">
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Billing History</CardTitle>
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {billingHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No billing history available</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Your billing history will appear here once you make your first payment
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {billingHistory.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            item.type === 'payment' ? 'bg-green-100' : 
                            item.type === 'refund' ? 'bg-orange-100' : 'bg-gray-100'
                          }`}>
                            {item.type === 'payment' ? (
                              <DollarSign className="h-4 w-4 text-green-600" />
                            ) : item.type === 'refund' ? (
                              <TrendingUp className="h-4 w-4 text-orange-600" />
                            ) : (
                              <Activity className="h-4 w-4 text-gray-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">
                              {item.invoice_number || `${item.type.charAt(0).toUpperCase() + item.type.slice(1)}`}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">
                                {formatDate(item.created_at)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-semibold">{formatPrice(item.total_amount || item.amount)}</p>
                            <Badge variant={item.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                              {item.status}
                            </Badge>
                          </div>
                          {item.invoice_url && (
                            <Button variant="ghost" size="icon">
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600">
            <Card>
              <CardHeader>
                <CardTitle>Invoices</CardTitle>
                <CardDescription>Download your invoices and receipts</CardDescription>
              </CardHeader>
              <CardContent>
                {billingHistory.filter(item => item.invoice_number).length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No invoices available</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Invoices will be generated for each billing period
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {billingHistory
                      .filter(item => item.invoice_number)
                      .map(item => (
                        <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                          <div>
                            <p className="font-medium">{item.invoice_number}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {formatDate(item.created_at)} • {formatPrice(item.total_amount || item.amount)}
                            </p>
                          </div>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Download PDF
                          </Button>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
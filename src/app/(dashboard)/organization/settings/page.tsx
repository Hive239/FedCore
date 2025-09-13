'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCurrentTenant } from '@/components/tenant/tenant-switcher'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/hooks/use-toast'
import { 
  Building2, 
  Globe, 
  Mail, 
  Phone, 
  MapPin, 
  FileText,
  Shield,
  CreditCard,
  Users,
  Settings,
  Save,
  Upload,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react'

interface TenantSettings {
  // General
  name: string
  slug: string
  description?: string
  logo_url?: string
  website?: string
  
  // Contact
  contact_email?: string
  contact_phone?: string
  support_email?: string
  
  // Address
  address_line1?: string
  address_line2?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
  
  // Business
  tax_id?: string
  business_type?: string
  industry?: string
  employee_count?: string
  
  // Features
  features: {
    projects_enabled: boolean
    tasks_enabled: boolean
    invoicing_enabled: boolean
    documents_enabled: boolean
    messaging_enabled: boolean
    calendar_enabled: boolean
    reports_enabled: boolean
    ai_features_enabled: boolean
  }
  
  // Preferences
  preferences: {
    timezone: string
    date_format: string
    currency: string
    language: string
    fiscal_year_start: number
    week_starts_on: number
  }
  
  // Limits (based on subscription)
  limits: {
    max_users: number
    max_projects: number
    max_storage_gb: number
    max_api_calls_per_month: number
  }
}

export default function OrganizationSettingsPage() {
  const { tenant, loading: tenantLoading } = useCurrentTenant()
  const [settings, setSettings] = useState<TenantSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (tenant) {
      loadSettings()
    }
  }, [tenant])

  const loadSettings = async () => {
    if (!tenant) return
    
    try {
      // Load tenant settings
      const { data, error } = await supabase
        .from('tenant_settings')
        .select('*')
        .eq('tenant_id', tenant.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      // If no settings exist, create default
      const defaultSettings: TenantSettings = {
        name: tenant.name,
        slug: tenant.slug,
        description: '',
        logo_url: tenant.logo_url,
        features: {
          projects_enabled: true,
          tasks_enabled: true,
          invoicing_enabled: true,
          documents_enabled: true,
          messaging_enabled: true,
          calendar_enabled: true,
          reports_enabled: true,
          ai_features_enabled: true,
        },
        preferences: {
          timezone: 'America/New_York',
          date_format: 'MM/DD/YYYY',
          currency: 'USD',
          language: 'en',
          fiscal_year_start: 1,
          week_starts_on: 0,
        },
        limits: {
          max_users: 10,
          max_projects: 50,
          max_storage_gb: 100,
          max_api_calls_per_month: 10000,
        }
      }

      setSettings(data || defaultSettings)
    } catch (error) {
      console.error('Error loading settings:', error)
      toast({
        variant: 'destructive',
        title: 'Error loading settings',
        description: 'Please refresh the page to try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!tenant || !settings) return

    setSaving(true)
    try {
      // Update tenant basic info
      const { error: tenantError } = await supabase
        .from('tenants')
        .update({
          name: settings.name,
          slug: settings.slug,
          logo_url: settings.logo_url,
        })
        .eq('id', tenant.id)

      if (tenantError) throw tenantError

      // Upsert tenant settings
      const { error: settingsError } = await supabase
        .from('tenant_settings')
        .upsert({
          tenant_id: tenant.id,
          ...settings,
          updated_at: new Date().toISOString(),
        })

      if (settingsError) throw settingsError

      toast({
        title: 'Settings saved',
        description: 'Your organization settings have been updated.',
      })
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        variant: 'destructive',
        title: 'Error saving settings',
        description: 'Please try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setSettings(prev => {
      if (!prev) return null
      
      const keys = field.split('.')
      const newSettings = { ...prev }
      let current: any = newSettings
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] }
        current = current[keys[i]]
      }
      
      current[keys[keys.length - 1]] = value
      return newSettings
    })
  }

  if (tenantLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Unable to load organization settings</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Organization Settings</h1>
          <p className="text-gray-600 mt-1">Manage your organization\'s configuration and preferences</p>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="limits">Limits</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Information</CardTitle>
              <CardDescription>Basic information about your organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Organization Name</Label>
                  <Input
                    id="name"
                    value={settings.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="slug">URL Slug</Label>
                  <Input
                    id="slug"
                    value={settings.slug}
                    onChange={(e) => handleInputChange('slug', e.target.value)}
                    placeholder="your-organization"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={settings.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={settings.website || ''}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="logo">Logo URL</Label>
                  <Input
                    id="logo"
                    value={settings.logo_url || ''}
                    onChange={(e) => handleInputChange('logo_url', e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>How to reach your organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact_email">Contact Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={settings.contact_email || ''}
                    onChange={(e) => handleInputChange('contact_email', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="support_email">Support Email</Label>
                  <Input
                    id="support_email"
                    type="email"
                    value={settings.support_email || ''}
                    onChange={(e) => handleInputChange('support_email', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="contact_phone">Phone Number</Label>
                <Input
                  id="contact_phone"
                  type="tel"
                  value={settings.contact_phone || ''}
                  onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Feature Management</CardTitle>
              <CardDescription>Enable or disable features for your organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(settings.features).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <Label htmlFor={key} className="text-base">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Label>
                    <p className="text-sm text-gray-500">
                      {getFeatureDescription(key)}
                    </p>
                  </div>
                  <Switch
                    id={key}
                    checked={value}
                    onCheckedChange={(checked) => handleInputChange(`features.${key}`, checked)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Regional Settings</CardTitle>
              <CardDescription>Customize formats and regional preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    value={settings.preferences.timezone}
                    onChange={(e) => handleInputChange('preferences.timezone', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="language">Language</Label>
                  <Input
                    id="language"
                    value={settings.preferences.language}
                    onChange={(e) => handleInputChange('preferences.language', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date_format">Date Format</Label>
                  <Input
                    id="date_format"
                    value={settings.preferences.date_format}
                    onChange={(e) => handleInputChange('preferences.date_format', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={settings.preferences.currency}
                    onChange={(e) => handleInputChange('preferences.currency', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="limits" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Usage Limits</CardTitle>
              <CardDescription>Based on your current subscription plan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(settings.limits).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="text-base">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Label>
                    <p className="text-sm text-gray-500">Current limit</p>
                  </div>
                  <div className="text-2xl font-semibold">{value.toLocaleString()}</div>
                </div>
              ))}
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <CreditCard className="h-4 w-4 inline mr-2" />
                  To increase your limits, upgrade your subscription plan.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>Technical and security configurations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <AlertCircle className="h-4 w-4 inline mr-2" />
                  Be careful when modifying advanced settings. Incorrect configurations may affect system functionality.
                </p>
              </div>
              <div>
                <Label htmlFor="tax_id">Tax ID / Business Number</Label>
                <Input
                  id="tax_id"
                  value={settings.tax_id || ''}
                  onChange={(e) => handleInputChange('tax_id', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="business_type">Business Type</Label>
                  <Input
                    id="business_type"
                    value={settings.business_type || ''}
                    onChange={(e) => handleInputChange('business_type', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    value={settings.industry || ''}
                    onChange={(e) => handleInputChange('industry', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function getFeatureDescription(feature: string): string {
  const descriptions: Record<string, string> = {
    projects_enabled: 'Allow users to create and manage projects',
    tasks_enabled: 'Enable task management and tracking',
    invoicing_enabled: 'Generate and manage invoices',
    documents_enabled: 'Upload and share documents',
    messaging_enabled: 'Internal messaging and team communication',
    calendar_enabled: 'Schedule events and meetings',
    reports_enabled: 'Generate analytics and reports',
    ai_features_enabled: 'Use AI-powered features and insights',
  }
  return descriptions[feature] || 'Manage this feature'
}
"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { 
  Save, 
  Hash,
  Settings,
  ArrowLeft,
  RefreshCw,
  Info
} from 'lucide-react'

interface ProjectCodeSettings {
  projectCodeFormat: string
  projectCodeAutoGenerate: boolean
  projectCodeNextNumber: number
  projectCodePrefix: string
}

const FORMAT_EXAMPLES = [
  { format: 'PRJ-{YEAR}-{NUMBER}', example: 'PRJ-2024-001', description: 'Standard format with year' },
  { format: '{PREFIX}-{YY}-{NUM}', example: 'CONST-24-0001', description: 'Short year with 4-digit number' },
  { format: '{PREFIX}/{YEAR}/{NUMBER}', example: 'BUILD/2024/001', description: 'Slash-separated format' },
  { format: 'P{NUMBER}', example: 'P001', description: 'Simple sequential numbering' },
  { format: '{PREFIX}-{NUMBER}', example: 'JOB-001', description: 'Prefix with number only' },
]

const FORMAT_VARIABLES = [
  { variable: '{PREFIX}', description: 'Custom prefix (e.g., PRJ, CONST, BUILD)' },
  { variable: '{YEAR}', description: 'Full year (2024)' },
  { variable: '{YY}', description: 'Two-digit year (24)' },
  { variable: '{NUMBER}', description: '3-digit padded number (001, 002, 003)' },
  { variable: '{NUM}', description: '4-digit padded number (0001, 0002)' },
]

export default function ProjectCodesPage() {
  const [settings, setSettings] = useState<ProjectCodeSettings>({
    projectCodeFormat: 'PRJ-{YEAR}-{NUMBER}',
    projectCodeAutoGenerate: true,
    projectCodeNextNumber: 1,
    projectCodePrefix: 'PRJ'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [previewCode, setPreviewCode] = useState('')
  
  const supabase = createClientComponentClient()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    generatePreview()
  }, [settings.projectCodeFormat, settings.projectCodePrefix, settings.projectCodeNextNumber])

  const loadSettings = async () => {
    try {
      // Get user's tenant
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.user) return

      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', session.session.user.id)
        .single()

      if (!userTenant) return

      const { data, error } = await supabase
        .from('tenants')
        .select('project_code_format, project_code_auto_generate, project_code_next_number, project_code_prefix')
        .eq('id', userTenant.tenant_id)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      if (data) {
        setSettings({
          projectCodeFormat: data.project_code_format || 'PRJ-{YEAR}-{NUMBER}',
          projectCodeAutoGenerate: data.project_code_auto_generate ?? true,
          projectCodeNextNumber: data.project_code_next_number || 1,
          projectCodePrefix: data.project_code_prefix || 'PRJ'
        })
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to load project code settings',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      // Get user's tenant
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.user) return

      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', session.session.user.id)
        .single()

      if (!userTenant) return

      const { error } = await supabase
        .from('tenants')
        .update({
          project_code_format: settings.projectCodeFormat,
          project_code_auto_generate: settings.projectCodeAutoGenerate,
          project_code_next_number: settings.projectCodeNextNumber,
          project_code_prefix: settings.projectCodePrefix,
          updated_at: new Date().toISOString()
        })
        .eq('id', userTenant.tenant_id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Project code settings saved successfully'
      })
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const generatePreview = () => {
    const year = new Date().getFullYear().toString()
    const shortYear = year.slice(-2)
    
    let preview = settings.projectCodeFormat
    preview = preview.replace('{PREFIX}', settings.projectCodePrefix)
    preview = preview.replace('{YEAR}', year)
    preview = preview.replace('{YY}', shortYear)
    preview = preview.replace('{NUMBER}', settings.projectCodeNextNumber.toString().padStart(3, '0'))
    preview = preview.replace('{NUM}', settings.projectCodeNextNumber.toString().padStart(4, '0'))
    
    setPreviewCode(preview)
  }

  const resetNextNumber = async () => {
    if (!confirm('Are you sure you want to reset the counter? This will affect all new projects.')) {
      return
    }

    try {
      // Get user's tenant
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.user) return

      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', session.session.user.id)
        .single()

      if (!userTenant) return

      const { error } = await supabase
        .from('tenants')
        .update({
          project_code_next_number: 1
        })
        .eq('id', userTenant.tenant_id)

      if (error) throw error

      setSettings({ ...settings, projectCodeNextNumber: 1 })
      toast({
        title: 'Success',
        description: 'Project code counter reset to 1'
      })
    } catch (error) {
      console.error('Error resetting counter:', error)
      toast({
        title: 'Error',
        description: 'Failed to reset counter',
        variant: 'destructive'
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/settings')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Project Code Settings</h1>
            <p className="text-muted-foreground">
              Configure automatic project ID generation
            </p>
          </div>
        </div>
        <Button
          onClick={saveSettings}
          disabled={saving}
          className="bg-purple-700 hover:bg-purple-800"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Preview Card */}
      <Card className="border-purple-200 bg-purple-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Preview
          </CardTitle>
          <CardDescription>
            Next project code will be:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-mono font-bold text-purple-700">
            {previewCode}
          </div>
        </CardContent>
      </Card>

      {/* Generation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Generation Settings
          </CardTitle>
          <CardDescription>
            Choose how project codes are generated
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auto-generate Toggle */}
          <div className="space-y-3">
            <Label>Code Generation Method</Label>
            <RadioGroup
              value={settings.projectCodeAutoGenerate ? 'auto' : 'manual'}
              onValueChange={(value) => setSettings({ ...settings, projectCodeAutoGenerate: value === 'auto' })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="auto" id="auto" />
                <Label htmlFor="auto" className="font-normal">
                  Automatic - System generates codes for new projects
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="manual" />
                <Label htmlFor="manual" className="font-normal">
                  Manual - Users enter codes when creating projects
                </Label>
              </div>
            </RadioGroup>
          </div>

          {settings.projectCodeAutoGenerate && (
            <>
              {/* Format Selection */}
              <div className="space-y-3">
                <Label htmlFor="format">Code Format</Label>
                <Input
                  id="format"
                  value={settings.projectCodeFormat}
                  onChange={(e) => setSettings({ ...settings, projectCodeFormat: e.target.value })}
                  placeholder="PRJ-{YEAR}-{NUMBER}"
                />
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Quick templates:</p>
                  <div className="grid gap-2">
                    {FORMAT_EXAMPLES.map((example) => (
                      <Button
                        key={example.format}
                        variant="outline"
                        size="sm"
                        className="justify-between text-left"
                        onClick={() => setSettings({ ...settings, projectCodeFormat: example.format })}
                      >
                        <span className="text-xs">{example.description}</span>
                        <span className="font-mono text-xs">{example.example}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Prefix */}
              <div className="space-y-2">
                <Label htmlFor="prefix">Custom Prefix</Label>
                <Input
                  id="prefix"
                  value={settings.projectCodePrefix}
                  onChange={(e) => setSettings({ ...settings, projectCodePrefix: e.target.value.toUpperCase() })}
                  placeholder="PRJ"
                  className="font-mono"
                />
                <p className="text-sm text-muted-foreground">
                  Used when {'{PREFIX}'} appears in the format
                </p>
              </div>

              {/* Next Number */}
              <div className="space-y-2">
                <Label htmlFor="nextNumber">Next Sequential Number</Label>
                <div className="flex gap-2">
                  <Input
                    id="nextNumber"
                    type="number"
                    min="1"
                    value={settings.projectCodeNextNumber}
                    onChange={(e) => setSettings({ ...settings, projectCodeNextNumber: parseInt(e.target.value) || 1 })}
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    onClick={resetNextNumber}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset to 1
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  This number increments automatically with each new project
                </p>
              </div>

              {/* Format Variables Help */}
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Info className="h-4 w-4" />
                  Available Format Variables
                </div>
                <div className="space-y-1">
                  {FORMAT_VARIABLES.map((variable) => (
                    <div key={variable.variable} className="text-sm">
                      <span className="font-mono font-medium">{variable.variable}</span>
                      <span className="text-muted-foreground"> - {variable.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Existing Codes Info */}
      <Card>
        <CardHeader>
          <CardTitle>Important Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Changes only affect new projects created after saving</p>
          <p>• Existing project codes will not be modified</p>
          <p>• Each project code must be unique across your organization</p>
          <p>• Manual codes can be entered even when auto-generation is enabled</p>
        </CardContent>
      </Card>
    </div>
  )
}
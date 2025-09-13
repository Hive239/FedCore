"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useToast } from '@/hooks/use-toast'
import { 
  Save, 
  FileText, 
  Building, 
  Signature,
  Mail,
  Phone,
  Globe,
  MapPin,
  Eye,
  RotateCcw
} from 'lucide-react'

interface ReportTemplate {
  id?: string
  companyName: string
  companyAddress: string
  companyPhone: string
  companyEmail: string
  companyWebsite: string
  reportHeader: string
  reportSubheader: string
  signatureTitle: string
  signatureText: string
  footerText: string
  includeCompanyLogo: boolean
  includePageNumbers: boolean
  includeGenerationDate: boolean
  defaultAttentionPrefix: string
}

export default function ReportTemplatesPage() {
  const [template, setTemplate] = useState<ReportTemplate>({
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    companyWebsite: '',
    reportHeader: 'PROJECT UPDATE REPORT',
    reportSubheader: 'Construction Progress Documentation',
    signatureTitle: 'Authorized Representative',
    signatureText: 'This report accurately reflects the current status of the project as of the date indicated.',
    footerText: 'Confidential - Property of [Company Name]',
    includeCompanyLogo: true,
    includePageNumbers: true,
    includeGenerationDate: true,
    defaultAttentionPrefix: 'Project Manager'
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClientComponentClient()
  const { toast } = useToast()

  useEffect(() => {
    loadTemplate()
  }, [])

  const loadTemplate = async () => {
    try {
      // Get current user and tenant
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        console.error('User not authenticated when loading template')
        setLoading(false)
        return
      }

      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single()
      
      if (!userTenant) {
        console.error('No tenant found for user')
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .eq('tenant_id', userTenant.tenant_id)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      if (data) {
        setTemplate(data)
      } else {
        // Load from organization settings as fallback
        const { data: orgData } = await supabase
          .from('tenants')
          .select('name, settings')
          .eq('id', userTenant.tenant_id)
          .single()

        if (orgData) {
          // Extract info from tenant settings if available
          const settings = orgData.settings || {}
          setTemplate(prev => ({
            ...prev,
            companyName: orgData.name || '',
            companyAddress: settings.address || '',
            companyPhone: settings.phone || '',
            companyEmail: settings.email || '',
            companyWebsite: settings.website || ''
          }))
        }
      }
    } catch (error) {
      console.error('Error loading template:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveTemplate = async () => {
    setSaving(true)
    try {
      // Get current user and tenant
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        toast({
          title: 'Error',
          description: 'User not authenticated',
          variant: 'destructive'
        })
        setSaving(false)
        return
      }

      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single()
      
      if (!userTenant) {
        toast({
          title: 'Error',
          description: 'No tenant found for user',
          variant: 'destructive'
        })
        setSaving(false)
        return
      }

      const { error } = await supabase
        .from('report_templates')
        .upsert({
          ...template,
          tenant_id: userTenant.tenant_id,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Report template settings saved successfully'
      })
    } catch (error) {
      console.error('Error saving template:', error)
      toast({
        title: 'Error',
        description: 'Failed to save template settings',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const resetToDefaults = () => {
    setTemplate({
      ...template,
      reportHeader: 'PROJECT UPDATE REPORT',
      reportSubheader: 'Construction Progress Documentation',
      signatureTitle: 'Authorized Representative',
      signatureText: 'This report accurately reflects the current status of the project as of the date indicated.',
      footerText: 'Confidential - Property of [Company Name]',
      includeCompanyLogo: true,
      includePageNumbers: true,
      includeGenerationDate: true,
      defaultAttentionPrefix: 'Project Manager'
    })
  }

  const previewReport = () => {
    const previewWindow = window.open('', '_blank')
    if (previewWindow) {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Report Template Preview</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #333; }
            .company-info { margin-bottom: 20px; font-size: 14px; color: #666; }
            .report-title { font-size: 24px; font-weight: bold; margin: 10px 0; }
            .report-subtitle { font-size: 16px; color: #666; }
            .content { min-height: 400px; padding: 20px; background: #f5f5f5; margin: 30px 0; }
            .signature-section { margin-top: 60px; }
            .signature-line { border-top: 1px solid #000; width: 300px; margin-top: 40px; }
            .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-info">
              <div style="font-weight: bold; font-size: 18px;">${template.companyName || '[Company Name]'}</div>
              <div>${template.companyAddress || '[Company Address]'}</div>
              <div>${template.companyPhone || '[Phone]'} | ${template.companyEmail || '[Email]'}</div>
              ${template.companyWebsite ? `<div>${template.companyWebsite}</div>` : ''}
            </div>
            <div class="report-title">${template.reportHeader}</div>
            <div class="report-subtitle">${template.reportSubheader}</div>
          </div>
          
          <div style="margin-bottom: 20px;">
            <strong>REF:</strong> REF-PRJ-2024-001-${new Date().toISOString().slice(0,10).replace(/-/g,'')}<br/>
            <strong>ATTN:</strong> ${template.defaultAttentionPrefix} - [Client Name]<br/>
            <strong>DATE:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          
          <div class="content">
            <p><em>This is a preview of your report template. Actual report content will appear here.</em></p>
            <p>Project updates, progress descriptions, tasks completed, and other relevant information will be displayed in this section.</p>
          </div>
          
          <div class="signature-section">
            <div class="signature-line"></div>
            <div style="margin-top: 10px;">
              <strong>${template.signatureTitle}</strong><br/>
              <div style="font-style: italic; margin-top: 10px; color: #666;">
                ${template.signatureText}
              </div>
            </div>
          </div>
          
          <div class="footer">
            ${template.footerText.replace('[Company Name]', template.companyName || '[Company Name]')}<br/>
            ${template.includeGenerationDate ? `Generated on ${new Date().toLocaleDateString()}` : ''}
            ${template.includePageNumbers ? ' | Page 1 of 1' : ''}
          </div>
        </body>
        </html>
      `
      previewWindow.document.write(html)
      previewWindow.document.close()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading template settings...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Report Templates</h1>
          <p className="text-muted-foreground">
            Configure headers, footers, and signatures for generated reports
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={previewReport}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button
            onClick={saveTemplate}
            disabled={saving}
            className="bg-purple-700 hover:bg-purple-800"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="company" className="space-y-4">
        <TabsList>
          <TabsTrigger value="company">Company Information</TabsTrigger>
          <TabsTrigger value="header">Report Header</TabsTrigger>
          <TabsTrigger value="signature">Signature Section</TabsTrigger>
          <TabsTrigger value="footer">Footer & Options</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>
                This information appears at the top of all generated reports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyName">
                    <Building className="inline h-4 w-4 mr-1" />
                    Company Name
                  </Label>
                  <Input
                    id="companyName"
                    value={template.companyName}
                    onChange={(e) => setTemplate({...template, companyName: e.target.value})}
                    placeholder="Your Company Name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyPhone">
                    <Phone className="inline h-4 w-4 mr-1" />
                    Phone Number
                  </Label>
                  <Input
                    id="companyPhone"
                    value={template.companyPhone}
                    onChange={(e) => setTemplate({...template, companyPhone: e.target.value})}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyAddress">
                  <MapPin className="inline h-4 w-4 mr-1" />
                  Company Address
                </Label>
                <Input
                  id="companyAddress"
                  value={template.companyAddress}
                  onChange={(e) => setTemplate({...template, companyAddress: e.target.value})}
                  placeholder="123 Main St, City, State 12345"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyEmail">
                    <Mail className="inline h-4 w-4 mr-1" />
                    Email Address
                  </Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={template.companyEmail}
                    onChange={(e) => setTemplate({...template, companyEmail: e.target.value})}
                    placeholder="info@company.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyWebsite">
                    <Globe className="inline h-4 w-4 mr-1" />
                    Website
                  </Label>
                  <Input
                    id="companyWebsite"
                    value={template.companyWebsite}
                    onChange={(e) => setTemplate({...template, companyWebsite: e.target.value})}
                    placeholder="www.company.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="header" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Report Header Configuration</CardTitle>
              <CardDescription>
                Customize the title and subtitle that appear on reports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reportHeader">
                  <FileText className="inline h-4 w-4 mr-1" />
                  Main Report Title
                </Label>
                <Input
                  id="reportHeader"
                  value={template.reportHeader}
                  onChange={(e) => setTemplate({...template, reportHeader: e.target.value})}
                  placeholder="PROJECT UPDATE REPORT"
                />
                <p className="text-sm text-muted-foreground">
                  This appears as the main title on all generated reports
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reportSubheader">Report Subtitle</Label>
                <Input
                  id="reportSubheader"
                  value={template.reportSubheader}
                  onChange={(e) => setTemplate({...template, reportSubheader: e.target.value})}
                  placeholder="Construction Progress Documentation"
                />
                <p className="text-sm text-muted-foreground">
                  Additional context that appears below the main title
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultAttn">Default Attention Prefix</Label>
                <Input
                  id="defaultAttn"
                  value={template.defaultAttentionPrefix}
                  onChange={(e) => setTemplate({...template, defaultAttentionPrefix: e.target.value})}
                  placeholder="Project Manager"
                />
                <p className="text-sm text-muted-foreground">
                  Default prefix for the ATTN field (e.g., "Project Manager - John Smith")
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signature" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Signature Section</CardTitle>
              <CardDescription>
                Configure the signature area that appears at the end of reports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signatureTitle">
                  <Signature className="inline h-4 w-4 mr-1" />
                  Signature Title
                </Label>
                <Input
                  id="signatureTitle"
                  value={template.signatureTitle}
                  onChange={(e) => setTemplate({...template, signatureTitle: e.target.value})}
                  placeholder="Authorized Representative"
                />
                <p className="text-sm text-muted-foreground">
                  Title that appears below the signature line
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signatureText">Signature Disclaimer Text</Label>
                <Textarea
                  id="signatureText"
                  value={template.signatureText}
                  onChange={(e) => setTemplate({...template, signatureText: e.target.value})}
                  rows={3}
                  placeholder="This report accurately reflects..."
                />
                <p className="text-sm text-muted-foreground">
                  Legal text or disclaimer that appears near the signature
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="footer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Footer & Display Options</CardTitle>
              <CardDescription>
                Configure footer text and report display options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="footerText">Footer Text</Label>
                <Input
                  id="footerText"
                  value={template.footerText}
                  onChange={(e) => setTemplate({...template, footerText: e.target.value})}
                  placeholder="Confidential - Property of [Company Name]"
                />
                <p className="text-sm text-muted-foreground">
                  Text that appears at the bottom of each page. Use [Company Name] to auto-insert company name.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="includePageNumbers"
                    checked={template.includePageNumbers}
                    onChange={(e) => setTemplate({...template, includePageNumbers: e.target.checked})}
                    className="rounded"
                  />
                  <Label htmlFor="includePageNumbers" className="font-normal">
                    Include page numbers (Page X of Y)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="includeGenerationDate"
                    checked={template.includeGenerationDate}
                    onChange={(e) => setTemplate({...template, includeGenerationDate: e.target.checked})}
                    className="rounded"
                  />
                  <Label htmlFor="includeGenerationDate" className="font-normal">
                    Include generation date in footer
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="includeCompanyLogo"
                    checked={template.includeCompanyLogo}
                    onChange={(e) => setTemplate({...template, includeCompanyLogo: e.target.checked})}
                    className="rounded"
                  />
                  <Label htmlFor="includeCompanyLogo" className="font-normal">
                    Include company logo (when available)
                  </Label>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={resetToDefaults}
                  className="w-full"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Default Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
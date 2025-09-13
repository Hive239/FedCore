-- Create report_templates table for PDF generation settings
CREATE TABLE IF NOT EXISTS public.report_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Company Information
  company_name TEXT,
  company_address TEXT,
  company_phone TEXT,
  company_email TEXT,
  company_website TEXT,
  
  -- Report Header Settings
  report_header TEXT DEFAULT 'PROJECT UPDATE REPORT',
  report_subheader TEXT DEFAULT 'Construction Progress Documentation',
  default_attention_prefix TEXT DEFAULT 'Project Manager',
  
  -- Signature Settings
  signature_title TEXT DEFAULT 'Authorized Representative',
  signature_text TEXT DEFAULT 'This report accurately reflects the current status of the project as of the date indicated.',
  
  -- Footer Settings
  footer_text TEXT DEFAULT 'Confidential - Property of [Company Name]',
  
  -- Display Options
  include_company_logo BOOLEAN DEFAULT true,
  include_page_numbers BOOLEAN DEFAULT true,
  include_generation_date BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  
  -- Ensure one template per tenant
  UNIQUE(tenant_id)
);

-- Create index for tenant lookup
CREATE INDEX IF NOT EXISTS idx_report_templates_tenant ON public.report_templates(tenant_id);

-- Enable RLS
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for tenant access
CREATE POLICY "report_templates_tenant_access" ON public.report_templates
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants
      WHERE user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT ALL ON public.report_templates TO authenticated;

-- Create function to auto-set tenant_id
CREATE OR REPLACE FUNCTION set_report_template_tenant()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT tenant_id INTO NEW.tenant_id
    FROM public.user_tenants
    WHERE user_id = auth.uid()
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-setting tenant
CREATE TRIGGER set_report_template_tenant_trigger
  BEFORE INSERT ON public.report_templates
  FOR EACH ROW
  EXECUTE FUNCTION set_report_template_tenant();

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_report_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_report_template_timestamp
  BEFORE UPDATE ON public.report_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_report_template_timestamp();
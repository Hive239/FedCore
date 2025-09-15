-- ============================================
-- TENANT MANAGEMENT ENHANCEMENTS
-- Advanced tenant features and management
-- Run AFTER critical missing tables
-- ============================================

-- Tenant Feature Flags
CREATE TABLE IF NOT EXISTS tenant_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  feature_name VARCHAR(100) NOT NULL,
  is_enabled BOOLEAN DEFAULT FALSE,
  configuration JSONB, -- Feature-specific configuration
  enabled_at TIMESTAMPTZ,
  enabled_by UUID REFERENCES profiles(id),
  expires_at TIMESTAMPTZ, -- For trial features
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, feature_name)
);

-- Tenant Usage Limits and Quotas
CREATE TABLE IF NOT EXISTS tenant_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  limit_type VARCHAR(100) NOT NULL, -- users, projects, storage_gb, api_calls, etc.
  limit_value DECIMAL(15,2) NOT NULL,
  current_usage DECIMAL(15,2) DEFAULT 0,
  warning_threshold DECIMAL(5,2) DEFAULT 0.80, -- 80%
  critical_threshold DECIMAL(5,2) DEFAULT 0.95, -- 95%
  reset_period VARCHAR(50), -- daily, weekly, monthly, never
  last_reset_at TIMESTAMPTZ,
  next_reset_at TIMESTAMPTZ,
  is_hard_limit BOOLEAN DEFAULT TRUE, -- Hard limit vs soft limit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, limit_type)
);

-- Tenant API Keys Management
CREATE TABLE IF NOT EXISTS tenant_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key_name VARCHAR(255) NOT NULL,
  api_key_hash VARCHAR(255) NOT NULL, -- Hashed version of the key
  key_prefix VARCHAR(20) NOT NULL, -- First few characters for identification
  permissions JSONB NOT NULL, -- Array of permitted actions/resources
  rate_limit_per_minute INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, key_name),
  UNIQUE(api_key_hash)
);

-- Tenant Settings and Preferences
CREATE TABLE IF NOT EXISTS tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  setting_category VARCHAR(100) NOT NULL, -- general, billing, security, notifications, etc.
  setting_key VARCHAR(255) NOT NULL,
  setting_value JSONB,
  is_encrypted BOOLEAN DEFAULT FALSE,
  is_readonly BOOLEAN DEFAULT FALSE,
  description TEXT,
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, setting_category, setting_key)
);

-- Tenant Domains (Custom domains)
CREATE TABLE IF NOT EXISTS tenant_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL UNIQUE,
  is_primary BOOLEAN DEFAULT FALSE,
  ssl_certificate JSONB, -- Certificate details
  verification_token VARCHAR(255),
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  dns_records JSONB, -- Required DNS records for verification
  status VARCHAR(50) DEFAULT 'pending', -- pending, verified, failed, expired
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenant Backup Settings
CREATE TABLE IF NOT EXISTS tenant_backup_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  backup_enabled BOOLEAN DEFAULT TRUE,
  backup_frequency VARCHAR(50) DEFAULT 'daily', -- hourly, daily, weekly, monthly
  backup_time TIME DEFAULT '02:00:00', -- Preferred backup time
  backup_retention_days INTEGER DEFAULT 30,
  include_files BOOLEAN DEFAULT TRUE,
  include_database BOOLEAN DEFAULT TRUE,
  encryption_enabled BOOLEAN DEFAULT TRUE,
  storage_location VARCHAR(255), -- S3 bucket, GCS bucket, etc.
  last_backup_at TIMESTAMPTZ,
  next_backup_at TIMESTAMPTZ,
  backup_size_bytes BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- Tenant Integrations
CREATE TABLE IF NOT EXISTS tenant_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  integration_type VARCHAR(100) NOT NULL, -- slack, teams, zapier, webhook, etc.
  integration_name VARCHAR(255) NOT NULL,
  configuration JSONB NOT NULL, -- Integration-specific config (encrypted if needed)
  is_active BOOLEAN DEFAULT TRUE,
  webhook_url TEXT,
  auth_credentials JSONB, -- Encrypted authentication details
  rate_limit_per_hour INTEGER DEFAULT 100,
  last_sync_at TIMESTAMPTZ,
  sync_status VARCHAR(50) DEFAULT 'active', -- active, error, paused
  error_message TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, integration_type, integration_name)
);

-- Tenant Audit Configuration
CREATE TABLE IF NOT EXISTS tenant_audit_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  audit_level VARCHAR(50) DEFAULT 'standard', -- minimal, standard, detailed, full
  retention_days INTEGER DEFAULT 365,
  log_user_actions BOOLEAN DEFAULT TRUE,
  log_admin_actions BOOLEAN DEFAULT TRUE,
  log_system_actions BOOLEAN DEFAULT FALSE,
  log_api_calls BOOLEAN DEFAULT TRUE,
  log_data_changes BOOLEAN DEFAULT TRUE,
  log_login_attempts BOOLEAN DEFAULT TRUE,
  log_file_access BOOLEAN DEFAULT FALSE,
  export_enabled BOOLEAN DEFAULT TRUE,
  encryption_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- Tenant Webhooks
CREATE TABLE IF NOT EXISTS tenant_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  webhook_name VARCHAR(255) NOT NULL,
  endpoint_url TEXT NOT NULL,
  events JSONB NOT NULL, -- Array of events to listen for
  secret_key VARCHAR(255), -- For webhook signature verification
  is_active BOOLEAN DEFAULT TRUE,
  retry_count INTEGER DEFAULT 3,
  timeout_seconds INTEGER DEFAULT 30,
  last_triggered_at TIMESTAMPTZ,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, webhook_name)
);

-- Tenant Usage Analytics
CREATE TABLE IF NOT EXISTS tenant_usage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(20,4) NOT NULL,
  metric_unit VARCHAR(50),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, usage_date, metric_name)
);

-- Tenant White-label Settings
CREATE TABLE IF NOT EXISTS tenant_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_name VARCHAR(255),
  logo_url TEXT,
  favicon_url TEXT,
  primary_color VARCHAR(7), -- Hex color
  secondary_color VARCHAR(7),
  accent_color VARCHAR(7),
  font_family VARCHAR(100),
  custom_css TEXT,
  email_template_header TEXT,
  email_template_footer TEXT,
  login_page_title VARCHAR(255),
  login_page_subtitle TEXT,
  dashboard_welcome_message TEXT,
  footer_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_features_tenant ON tenant_features(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_features_name ON tenant_features(feature_name);
CREATE INDEX IF NOT EXISTS idx_tenant_features_enabled ON tenant_features(is_enabled);

CREATE INDEX IF NOT EXISTS idx_tenant_limits_tenant ON tenant_limits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_limits_type ON tenant_limits(limit_type);
CREATE INDEX IF NOT EXISTS idx_tenant_limits_usage ON tenant_limits(current_usage, limit_value);

CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_tenant ON tenant_api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_hash ON tenant_api_keys(api_key_hash);
CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_active ON tenant_api_keys(is_active);

CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant ON tenant_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_settings_category ON tenant_settings(setting_category);

CREATE INDEX IF NOT EXISTS idx_tenant_domains_tenant ON tenant_domains(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_domains_domain ON tenant_domains(domain);
CREATE INDEX IF NOT EXISTS idx_tenant_domains_verified ON tenant_domains(is_verified);

CREATE INDEX IF NOT EXISTS idx_tenant_integrations_tenant ON tenant_integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_integrations_type ON tenant_integrations(integration_type);
CREATE INDEX IF NOT EXISTS idx_tenant_integrations_active ON tenant_integrations(is_active);

CREATE INDEX IF NOT EXISTS idx_tenant_webhooks_tenant ON tenant_webhooks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_webhooks_active ON tenant_webhooks(is_active);

CREATE INDEX IF NOT EXISTS idx_tenant_usage_analytics ON tenant_usage_analytics(tenant_id, usage_date);

-- RLS Policies
ALTER TABLE tenant_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_backup_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_audit_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_branding ENABLE ROW LEVEL SECURITY;

-- Admin/Owner only policies for tenant management
DO $$ BEGIN
  CREATE POLICY tenant_features_admin_policy ON tenant_features
    FOR ALL USING (tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    ));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY tenant_limits_admin_policy ON tenant_limits
    FOR ALL USING (tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    ));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY tenant_api_keys_admin_policy ON tenant_api_keys
    FOR ALL USING (tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    ));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY tenant_settings_member_policy ON tenant_settings
    FOR SELECT USING (tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    ));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY tenant_settings_admin_write_policy ON tenant_settings
    FOR INSERT WITH CHECK (tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    ));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Functions for tenant management
CREATE OR REPLACE FUNCTION get_tenant_usage(p_tenant_id UUID, p_limit_type TEXT)
RETURNS DECIMAL(15,2) AS $$
DECLARE
  usage_value DECIMAL(15,2);
BEGIN
  SELECT current_usage INTO usage_value
  FROM tenant_limits 
  WHERE tenant_id = p_tenant_id AND limit_type = p_limit_type;
  
  RETURN COALESCE(usage_value, 0);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_tenant_limit(p_tenant_id UUID, p_limit_type TEXT, p_increment DECIMAL(15,2) DEFAULT 1)
RETURNS BOOLEAN AS $$
DECLARE
  limit_record tenant_limits%ROWTYPE;
BEGIN
  SELECT * INTO limit_record
  FROM tenant_limits 
  WHERE tenant_id = p_tenant_id AND limit_type = p_limit_type;
  
  IF NOT FOUND THEN
    RETURN TRUE; -- No limit configured
  END IF;
  
  RETURN (limit_record.current_usage + p_increment) <= limit_record.limit_value;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_tenant_usage(p_tenant_id UUID, p_limit_type TEXT, p_increment DECIMAL(15,2))
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO tenant_limits (tenant_id, limit_type, current_usage, limit_value)
  VALUES (p_tenant_id, p_limit_type, p_increment, 999999999)
  ON CONFLICT (tenant_id, limit_type) 
  DO UPDATE SET 
    current_usage = tenant_limits.current_usage + p_increment,
    updated_at = NOW();
    
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to reset usage counters
CREATE OR REPLACE FUNCTION reset_tenant_usage_counters()
RETURNS INTEGER AS $$
DECLARE
  reset_count INTEGER := 0;
BEGIN
  UPDATE tenant_limits 
  SET 
    current_usage = 0,
    last_reset_at = NOW(),
    next_reset_at = CASE 
      WHEN reset_period = 'daily' THEN NOW() + INTERVAL '1 day'
      WHEN reset_period = 'weekly' THEN NOW() + INTERVAL '1 week'  
      WHEN reset_period = 'monthly' THEN NOW() + INTERVAL '1 month'
      ELSE next_reset_at
    END
  WHERE reset_period IS NOT NULL 
    AND next_reset_at <= NOW();
    
  GET DIAGNOSTICS reset_count = ROW_COUNT;
  RETURN reset_count;
END;
$$ LANGUAGE plpgsql;
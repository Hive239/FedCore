-- ============================================
-- Safe Billing Schema Creation
-- Drops existing tables if needed and recreates
-- ============================================

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS public.coupon_usage CASCADE;
DROP TABLE IF EXISTS public.coupons CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.usage_tracking CASCADE;
DROP TABLE IF EXISTS public.payment_methods CASCADE;
DROP TABLE IF EXISTS public.billing_history CASCADE;
DROP TABLE IF EXISTS public.tenant_subscriptions CASCADE;
DROP TABLE IF EXISTS public.subscription_plans CASCADE;

-- ============================================
-- Billing and Subscription Schema
-- ============================================

-- Subscription Plans Table
CREATE TABLE public.subscription_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  price_monthly DECIMAL(10, 2) NOT NULL,
  price_yearly DECIMAL(10, 2),
  stripe_price_id_monthly VARCHAR(255),
  stripe_price_id_yearly VARCHAR(255),
  
  -- Limits and Features
  max_users INTEGER DEFAULT 5,
  max_projects INTEGER DEFAULT 10,
  max_storage_gb INTEGER DEFAULT 10,
  max_file_size_mb INTEGER DEFAULT 100,
  
  -- Feature Flags
  features JSONB DEFAULT jsonb_build_object(
    'api_access', false,
    'advanced_reports', false,
    'custom_branding', false,
    'priority_support', false,
    'data_export', true,
    'integrations', false,
    'ai_features', false,
    'unlimited_storage', false,
    'dedicated_support', false,
    'sso', false,
    'audit_logs', false,
    'custom_roles', false
  ),
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  badge_text VARCHAR(50),
  badge_color VARCHAR(7),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenant Subscriptions Table
CREATE TABLE public.tenant_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  
  -- Stripe Information
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_customer_id VARCHAR(255),
  
  -- Subscription Status
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'paused', 'incomplete')),
  billing_cycle VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  
  -- Dates
  trial_start_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  canceled_at TIMESTAMPTZ,
  pause_start_date TIMESTAMPTZ,
  pause_end_date TIMESTAMPTZ,
  
  -- Usage Tracking
  current_users INTEGER DEFAULT 0,
  current_projects INTEGER DEFAULT 0,
  current_storage_used_gb DECIMAL(10, 2) DEFAULT 0,
  
  -- Billing
  next_billing_date TIMESTAMPTZ,
  amount DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'USD',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Billing History Table
CREATE TABLE public.billing_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.tenant_subscriptions(id),
  
  -- Transaction Details
  type VARCHAR(50) NOT NULL CHECK (type IN ('payment', 'refund', 'credit', 'charge', 'adjustment')),
  status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'canceled')),
  
  -- Amounts
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2),
  
  -- Payment Information
  payment_method VARCHAR(50),
  stripe_payment_intent_id VARCHAR(255),
  stripe_invoice_id VARCHAR(255),
  invoice_number VARCHAR(100),
  invoice_url TEXT,
  receipt_url TEXT,
  
  -- Period
  billing_period_start DATE,
  billing_period_end DATE,
  
  -- Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment Methods Table
CREATE TABLE public.payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Stripe Information
  stripe_payment_method_id VARCHAR(255) UNIQUE,
  
  -- Card Details (last 4 digits only for security)
  type VARCHAR(50) DEFAULT 'card' CHECK (type IN ('card', 'bank_account', 'paypal')),
  brand VARCHAR(50),
  last4 VARCHAR(4),
  exp_month INTEGER,
  exp_year INTEGER,
  
  -- Billing Address
  billing_name VARCHAR(255),
  billing_email VARCHAR(255),
  billing_phone VARCHAR(50),
  billing_address_line1 VARCHAR(255),
  billing_address_line2 VARCHAR(255),
  billing_city VARCHAR(100),
  billing_state VARCHAR(100),
  billing_postal_code VARCHAR(20),
  billing_country VARCHAR(2),
  
  -- Status
  is_default BOOLEAN DEFAULT false,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'canceled')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage Tracking Table
CREATE TABLE public.usage_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Date for aggregation
  date DATE NOT NULL,
  
  -- Usage Metrics
  active_users INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  storage_used_gb DECIMAL(10, 2) DEFAULT 0,
  bandwidth_used_gb DECIMAL(10, 2) DEFAULT 0,
  projects_count INTEGER DEFAULT 0,
  tasks_count INTEGER DEFAULT 0,
  files_count INTEGER DEFAULT 0,
  
  -- Feature Usage
  features_used JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, date)
);

-- Invoices Table
CREATE TABLE public.invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Invoice Details
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'canceled')),
  
  -- Dates
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  paid_date DATE,
  
  -- Amounts
  subtotal DECIMAL(10, 2) NOT NULL,
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  amount_paid DECIMAL(10, 2) DEFAULT 0,
  amount_due DECIMAL(10, 2),
  
  -- Line Items stored as JSONB
  line_items JSONB NOT NULL DEFAULT '[]',
  
  -- Customer Information
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_address JSONB,
  
  -- Payment
  payment_method_id UUID REFERENCES public.payment_methods(id),
  stripe_invoice_id VARCHAR(255),
  
  -- URLs
  pdf_url TEXT,
  public_url TEXT,
  
  -- Notes
  notes TEXT,
  terms TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coupons and Discounts Table
CREATE TABLE public.coupons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  
  -- Discount Details
  discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10, 2) NOT NULL,
  
  -- Usage Limits
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  max_uses_per_tenant INTEGER DEFAULT 1,
  
  -- Valid Period
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  
  -- Applicable Plans
  applicable_plans UUID[] DEFAULT ARRAY[]::UUID[],
  minimum_amount DECIMAL(10, 2),
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coupon Usage Table
CREATE TABLE public.coupon_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL REFERENCES public.coupons(id),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  used_at TIMESTAMPTZ DEFAULT NOW(),
  discount_applied DECIMAL(10, 2),
  invoice_id UUID REFERENCES public.invoices(id),
  
  UNIQUE(coupon_id, tenant_id)
);

-- ============================================
-- Insert Default Subscription Plans
-- ============================================

INSERT INTO public.subscription_plans (
  name, description, 
  price_monthly, price_yearly,
  max_users, max_projects, max_storage_gb,
  features, badge_text, badge_color, display_order
) VALUES 
(
  'Free', 'Perfect for trying out ProjectPro',
  0, 0,
  2, 3, 1,
  jsonb_build_object(
    'api_access', false,
    'advanced_reports', false,
    'custom_branding', false,
    'priority_support', false,
    'data_export', true,
    'integrations', false,
    'ai_features', false
  ),
  NULL, NULL, 0
),
(
  'Starter', 'Great for small teams',
  29, 290,
  10, 25, 10,
  jsonb_build_object(
    'api_access', true,
    'advanced_reports', false,
    'custom_branding', false,
    'priority_support', false,
    'data_export', true,
    'integrations', true,
    'ai_features', false
  ),
  NULL, NULL, 1
),
(
  'Professional', 'For growing businesses',
  59, 590,
  50, 100, 100,
  jsonb_build_object(
    'api_access', true,
    'advanced_reports', true,
    'custom_branding', true,
    'priority_support', true,
    'data_export', true,
    'integrations', true,
    'ai_features', true,
    'audit_logs', true
  ),
  'Most Popular', '#3B82F6', 2
),
(
  'Enterprise', 'Custom solutions for large organizations',
  99, 990,
  -1, -1, 1000,
  jsonb_build_object(
    'api_access', true,
    'advanced_reports', true,
    'custom_branding', true,
    'priority_support', true,
    'data_export', true,
    'integrations', true,
    'ai_features', true,
    'unlimited_storage', true,
    'dedicated_support', true,
    'sso', true,
    'audit_logs', true,
    'custom_roles', true
  ),
  'Best Value', '#10B981', 3
)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- Create default subscription for existing tenants
-- ============================================
INSERT INTO public.tenant_subscriptions (
  tenant_id,
  plan_id,
  status,
  billing_cycle,
  current_period_start,
  current_period_end,
  current_users,
  current_projects,
  current_storage_used_gb
)
SELECT 
  t.id,
  (SELECT id FROM subscription_plans WHERE name = 'Professional' LIMIT 1),
  'active',
  'monthly',
  NOW(),
  NOW() + INTERVAL '30 days',
  (SELECT COUNT(*) FROM user_tenants WHERE tenant_id = t.id),
  (SELECT COUNT(*) FROM projects WHERE tenant_id = t.id),
  0
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM tenant_subscriptions ts WHERE ts.tenant_id = t.id
);

-- ============================================
-- Indexes for Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant_id ON tenant_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_status ON tenant_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_billing_history_tenant_id ON billing_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_created_at ON billing_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_methods_tenant_id ON payment_methods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_tenant_date ON usage_tracking(tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;

-- Public can view subscription plans
CREATE POLICY "Public can view subscription plans" 
  ON subscription_plans FOR SELECT 
  USING (is_active = true);

-- Tenant members can view their subscription
CREATE POLICY "Tenant members can view their subscription" 
  ON tenant_subscriptions FOR SELECT 
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

-- Only tenant admins can manage subscriptions
CREATE POLICY "Tenant admins can manage subscriptions" 
  ON tenant_subscriptions FOR ALL 
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- Tenant members can view billing history
CREATE POLICY "Tenant members can view billing history" 
  ON billing_history FOR SELECT 
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

-- Tenant admins can view payment methods
CREATE POLICY "Tenant admins can view payment methods" 
  ON payment_methods FOR SELECT 
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- Tenant members can view usage
CREATE POLICY "Tenant members can view usage" 
  ON usage_tracking FOR SELECT 
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

-- Tenant members can view invoices
CREATE POLICY "Tenant members can view invoices" 
  ON invoices FOR SELECT 
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

-- Public can view active coupons
CREATE POLICY "Public can view active coupons" 
  ON coupons FOR SELECT 
  USING (is_active = true AND valid_until > NOW());

-- View coupon usage for own tenant
CREATE POLICY "Tenant members can view coupon usage" 
  ON coupon_usage FOR SELECT 
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Billing schema created successfully!';
  RAISE NOTICE 'Default subscription plans have been added.';
  RAISE NOTICE 'Existing tenants have been assigned to the Professional plan.';
END $$;
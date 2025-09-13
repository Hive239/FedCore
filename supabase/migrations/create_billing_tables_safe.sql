-- This is a safe version that won't error if tables or data already exist

-- Create subscription_plans table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_users INTEGER NOT NULL DEFAULT 1,
  max_projects INTEGER NOT NULL DEFAULT 1,
  max_storage_gb INTEGER NOT NULL DEFAULT 1,
  features JSONB NOT NULL DEFAULT '{}',
  badge_text VARCHAR(100),
  badge_color VARCHAR(20),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tenant_subscriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.tenant_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  current_users INTEGER NOT NULL DEFAULT 0,
  current_projects INTEGER NOT NULL DEFAULT 0,
  current_storage_used_gb DECIMAL(10,2) NOT NULL DEFAULT 0,
  trial_end_date TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create billing_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.billing_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  description TEXT,
  invoice_number VARCHAR(100),
  invoice_url TEXT,
  receipt_url TEXT,
  billing_period_start TIMESTAMPTZ,
  billing_period_end TIMESTAMPTZ,
  stripe_payment_intent_id VARCHAR(255),
  stripe_invoice_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payment_methods table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  brand VARCHAR(50),
  last4 VARCHAR(4),
  exp_month INTEGER,
  exp_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  status VARCHAR(50) DEFAULT 'active',
  stripe_payment_method_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert subscription plans only if they don't exist
INSERT INTO public.subscription_plans (name, description, price_monthly, price_yearly, max_users, max_projects, max_storage_gb, features, display_order, badge_text, badge_color)
SELECT * FROM (VALUES
  ('Free', 'Perfect for individuals and small teams just getting started', 0, 0, 3, 5, 5, 
    '{"api_access": false, "advanced_reports": false, "custom_branding": false, "priority_support": false, "data_export": true, "integrations": false, "ai_features": false, "unlimited_storage": false, "dedicated_support": false, "sso": false, "audit_logs": false, "custom_roles": false}'::jsonb,
    1, NULL, NULL),
  ('Pro', 'For growing teams that need more power and flexibility', 29, 290, 10, 20, 50,
    '{"api_access": true, "advanced_reports": true, "custom_branding": false, "priority_support": true, "data_export": true, "integrations": true, "ai_features": true, "unlimited_storage": false, "dedicated_support": false, "sso": false, "audit_logs": true, "custom_roles": false}'::jsonb,
    2, 'Most Popular', '#3B82F6'),
  ('Business', 'For teams that need advanced features and priority support', 59, 590, 25, 50, 200,
    '{"api_access": true, "advanced_reports": true, "custom_branding": true, "priority_support": true, "data_export": true, "integrations": true, "ai_features": true, "unlimited_storage": false, "dedicated_support": true, "sso": true, "audit_logs": true, "custom_roles": true}'::jsonb,
    3, 'Best Value', '#10B981'),
  ('Enterprise', 'For large organizations with custom needs', 199, 1990, -1, -1, 1000,
    '{"api_access": true, "advanced_reports": true, "custom_branding": true, "priority_support": true, "data_export": true, "integrations": true, "ai_features": true, "unlimited_storage": true, "dedicated_support": true, "sso": true, "audit_logs": true, "custom_roles": true}'::jsonb,
    4, 'Enterprise', '#7C3AED')
) AS new_plans(name, description, price_monthly, price_yearly, max_users, max_projects, max_storage_gb, features, display_order, badge_text, badge_color)
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE subscription_plans.name = new_plans.name);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant_id ON tenant_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_tenant_id ON billing_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_tenant_id ON payment_methods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_status ON tenant_subscriptions(status);

-- Enable Row Level Security (RLS) if not already enabled
DO $$ 
BEGIN
  ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
  ALTER TABLE tenant_subscriptions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;
  ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view subscription plans" ON subscription_plans;
DROP POLICY IF EXISTS "Users can view their tenant subscription" ON tenant_subscriptions;
DROP POLICY IF EXISTS "Admins can manage tenant subscription" ON tenant_subscriptions;
DROP POLICY IF EXISTS "Users can view their billing history" ON billing_history;
DROP POLICY IF EXISTS "Admins can manage billing history" ON billing_history;
DROP POLICY IF EXISTS "Admins can view payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Admins can manage payment methods" ON payment_methods;

-- Create RLS policies

-- Subscription plans are viewable by all authenticated users
CREATE POLICY "Users can view subscription plans"
  ON subscription_plans FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Tenant subscriptions are viewable/editable by tenant members
CREATE POLICY "Users can view their tenant subscription"
  ON tenant_subscriptions FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage tenant subscription"
  ON tenant_subscriptions FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Billing history is viewable by tenant members
CREATE POLICY "Users can view their billing history"
  ON billing_history FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage billing history"
  ON billing_history FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Payment methods are viewable/editable by tenant admins
CREATE POLICY "Admins can view payment methods"
  ON payment_methods FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can manage payment methods"
  ON payment_methods FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
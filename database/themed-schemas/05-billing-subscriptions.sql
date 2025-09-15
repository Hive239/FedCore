-- ============================================
-- BILLING & SUBSCRIPTION MANAGEMENT SCHEMA
-- Adds complete billing and subscription features
-- Run AFTER complete-production-setup-fixed.sql
-- ============================================

-- Subscription Plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  max_users INTEGER,
  max_projects INTEGER,
  max_storage_gb DECIMAL(10,2),
  max_api_calls_per_day INTEGER,
  features JSONB NOT NULL,
  stripe_product_id VARCHAR(255),
  stripe_price_monthly_id VARCHAR(255),
  stripe_price_yearly_id VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenant Subscriptions
CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, cancelled, past_due, unpaid, trialing
  billing_cycle VARCHAR(20) NOT NULL, -- monthly, yearly
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  cancelled_at TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  stripe_subscription_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- Billing History
CREATE TABLE IF NOT EXISTS billing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES tenant_subscriptions(id),
  invoice_number VARCHAR(100) UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) NOT NULL, -- paid, pending, failed, refunded
  payment_method VARCHAR(50),
  payment_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  description TEXT,
  stripe_invoice_id VARCHAR(255),
  stripe_payment_intent_id VARCHAR(255),
  pdf_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment Methods
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- card, bank_account, paypal
  is_default BOOLEAN DEFAULT FALSE,
  last_four VARCHAR(4),
  brand VARCHAR(50), -- visa, mastercard, amex, etc.
  exp_month INTEGER,
  exp_year INTEGER,
  bank_name VARCHAR(100),
  stripe_payment_method_id VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage Tracking
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tracking_date DATE NOT NULL,
  metric_type VARCHAR(50) NOT NULL, -- users, projects, storage, api_calls
  usage_value DECIMAL(20,4) NOT NULL,
  limit_value DECIMAL(20,4),
  overage_value DECIMAL(20,4) DEFAULT 0,
  unit_price DECIMAL(10,6),
  total_cost DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, tracking_date, metric_type)
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_number VARCHAR(100) NOT NULL UNIQUE,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, sent, paid, overdue, cancelled
  payment_terms VARCHAR(100),
  notes TEXT,
  line_items JSONB NOT NULL,
  tax_details JSONB,
  billing_address JSONB,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  stripe_invoice_id VARCHAR(255),
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coupons
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL, -- percentage, fixed_amount
  discount_value DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  applies_to VARCHAR(50) DEFAULT 'all', -- all, specific_plans
  applicable_plan_ids UUID[],
  minimum_amount DECIMAL(10,2),
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  stripe_coupon_id VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coupon Usage
CREATE TABLE IF NOT EXISTS coupon_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES tenant_subscriptions(id),
  invoice_id UUID REFERENCES invoices(id),
  discount_amount DECIMAL(10,2) NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(coupon_id, tenant_id)
);

-- Billing Alerts
CREATE TABLE IF NOT EXISTS billing_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  alert_type VARCHAR(100) NOT NULL, -- usage_limit, payment_failed, subscription_expiring
  severity VARCHAR(20) NOT NULL, -- info, warning, critical
  message TEXT NOT NULL,
  details JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  read_by UUID REFERENCES profiles(id),
  action_required BOOLEAN DEFAULT FALSE,
  action_taken VARCHAR(100),
  action_taken_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenant Billing Settings
CREATE TABLE IF NOT EXISTS tenant_billing_settings (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  billing_email VARCHAR(255),
  billing_name VARCHAR(255),
  billing_address JSONB,
  tax_id VARCHAR(100),
  tax_exempt BOOLEAN DEFAULT FALSE,
  tax_exempt_certificate TEXT,
  invoice_prefix VARCHAR(20),
  invoice_notes TEXT,
  payment_terms INTEGER DEFAULT 30, -- days
  auto_charge BOOLEAN DEFAULT TRUE,
  send_invoice_emails BOOLEAN DEFAULT TRUE,
  usage_alert_threshold INTEGER DEFAULT 80, -- percentage
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Revenue Recognition
CREATE TABLE IF NOT EXISTS revenue_recognition (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id),
  subscription_id UUID REFERENCES tenant_subscriptions(id),
  recognition_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  type VARCHAR(50) NOT NULL, -- subscription, usage, one_time
  status VARCHAR(50) DEFAULT 'pending', -- pending, recognized, deferred
  accounting_period VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_subscription_plans_active ON subscription_plans(is_active);
CREATE INDEX idx_tenant_subscriptions_tenant ON tenant_subscriptions(tenant_id);
CREATE INDEX idx_tenant_subscriptions_status ON tenant_subscriptions(status);
CREATE INDEX idx_billing_history_tenant ON billing_history(tenant_id);
CREATE INDEX idx_billing_history_status ON billing_history(status);
CREATE INDEX idx_payment_methods_tenant ON payment_methods(tenant_id);
CREATE INDEX idx_usage_tracking_lookup ON usage_tracking(tenant_id, tracking_date);
CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due ON invoices(due_date);
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupon_usage_tenant ON coupon_usage(tenant_id);
CREATE INDEX idx_billing_alerts_tenant ON billing_alerts(tenant_id);
CREATE INDEX idx_billing_alerts_unread ON billing_alerts(tenant_id, is_read);
CREATE INDEX idx_revenue_recognition_tenant ON revenue_recognition(tenant_id);
CREATE INDEX idx_revenue_recognition_date ON revenue_recognition(recognition_date);

-- RLS Policies
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_billing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_recognition ENABLE ROW LEVEL SECURITY;

-- Subscription plans are public read
CREATE POLICY subscription_plans_public_read ON subscription_plans
  FOR SELECT USING (is_active = true);

-- Tenant-specific policies
CREATE POLICY tenant_subscriptions_tenant_policy ON tenant_subscriptions
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY billing_history_tenant_policy ON billing_history
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY payment_methods_tenant_policy ON payment_methods
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY invoices_tenant_policy ON invoices
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));
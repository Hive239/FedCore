-- ============================================
-- REPORTING & ANALYTICS SCHEMA
-- Enhanced reporting and analytics features
-- Run AFTER complete-production-setup-fixed.sql
-- ============================================

-- Gantt Chart Items (Enhanced)
CREATE TABLE IF NOT EXISTS gantt_chart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES gantt_chart_items(id),
  item_type VARCHAR(50) NOT NULL, -- milestone, task, phase, dependency
  title VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  progress DECIMAL(5,2) DEFAULT 0,
  dependencies UUID[],
  critical_path BOOLEAN DEFAULT FALSE,
  resource_ids UUID[],
  color VARCHAR(7),
  expanded BOOLEAN DEFAULT TRUE,
  sort_order INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Report Templates
CREATE TABLE IF NOT EXISTS report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_type VARCHAR(100) NOT NULL, -- gantt, burndown, velocity, custom
  template_config JSONB NOT NULL,
  default_filters JSONB,
  layout_config JSONB,
  chart_config JSONB,
  export_formats VARCHAR(20)[] DEFAULT ARRAY['pdf', 'excel', 'csv'],
  is_public BOOLEAN DEFAULT FALSE,
  is_system BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated Reports
CREATE TABLE IF NOT EXISTS generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id UUID REFERENCES report_templates(id),
  name VARCHAR(255) NOT NULL,
  report_type VARCHAR(100) NOT NULL,
  parameters JSONB,
  filters JSONB,
  data JSONB,
  file_url TEXT,
  file_format VARCHAR(20),
  file_size_bytes INTEGER,
  generation_time_ms INTEGER,
  generated_by UUID REFERENCES profiles(id),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Custom Dashboards
CREATE TABLE IF NOT EXISTS custom_dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  layout JSONB NOT NULL, -- Grid layout configuration
  widgets JSONB NOT NULL, -- Widget configurations
  refresh_interval INTEGER, -- seconds
  is_default BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dashboard Widgets
CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES custom_dashboards(id) ON DELETE CASCADE,
  widget_type VARCHAR(100) NOT NULL, -- chart, metric, table, map, calendar
  title VARCHAR(255),
  data_source VARCHAR(100) NOT NULL,
  query JSONB,
  visualization_config JSONB,
  refresh_interval INTEGER,
  position JSONB, -- Grid position
  size JSONB, -- Grid size
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics Aggregations
CREATE TABLE IF NOT EXISTS analytics_aggregations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  aggregation_type VARCHAR(100) NOT NULL,
  granularity VARCHAR(20) NOT NULL, -- hour, day, week, month, quarter, year
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  dimensions JSONB,
  metrics JSONB NOT NULL,
  filters JSONB,
  row_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, aggregation_type, granularity, period_start)
);

-- KPI Definitions
CREATE TABLE IF NOT EXISTS kpi_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  calculation_method VARCHAR(50) NOT NULL, -- sum, average, count, custom
  calculation_formula TEXT,
  data_source VARCHAR(100),
  target_value DECIMAL(20,4),
  target_type VARCHAR(20), -- fixed, percentage, dynamic
  unit VARCHAR(50),
  direction VARCHAR(20), -- higher_better, lower_better, target
  thresholds JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- KPI Values
CREATE TABLE IF NOT EXISTS kpi_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id UUID NOT NULL REFERENCES kpi_definitions(id) ON DELETE CASCADE,
  period_date DATE NOT NULL,
  actual_value DECIMAL(20,4) NOT NULL,
  target_value DECIMAL(20,4),
  variance DECIMAL(20,4),
  variance_percentage DECIMAL(10,2),
  status VARCHAR(20), -- on_target, above_target, below_target
  trend VARCHAR(20), -- improving, stable, declining
  metadata JSONB,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kpi_id, period_date)
);

-- Report Schedules
CREATE TABLE IF NOT EXISTS report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id UUID REFERENCES report_templates(id),
  name VARCHAR(255) NOT NULL,
  schedule_type VARCHAR(50) NOT NULL, -- once, daily, weekly, monthly
  schedule_config JSONB, -- Cron expression or specific schedule details
  recipients JSONB, -- Email addresses and delivery methods
  parameters JSONB,
  export_format VARCHAR(20) DEFAULT 'pdf',
  is_active BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data Exports
CREATE TABLE IF NOT EXISTS data_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  export_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  filters JSONB,
  columns JSONB,
  format VARCHAR(20) NOT NULL, -- csv, excel, json, xml
  file_url TEXT,
  file_size_bytes INTEGER,
  row_count INTEGER,
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
  error_message TEXT,
  requested_by UUID REFERENCES profiles(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- Custom Metrics
CREATE TABLE IF NOT EXISTS custom_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  metric_type VARCHAR(50) NOT NULL,
  calculation_sql TEXT,
  parameters JSONB,
  cache_duration_seconds INTEGER DEFAULT 3600,
  last_calculated_at TIMESTAMPTZ,
  last_value DECIMAL(20,4),
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business Intelligence Cache
CREATE TABLE IF NOT EXISTS bi_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key VARCHAR(255) NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  query_hash VARCHAR(64) NOT NULL,
  result_data JSONB NOT NULL,
  metadata JSONB,
  hit_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(cache_key, tenant_id)
);

-- Create indexes for performance
CREATE INDEX idx_gantt_chart_project ON gantt_chart_items(project_id);
CREATE INDEX idx_gantt_chart_dates ON gantt_chart_items(start_date, end_date);
CREATE INDEX idx_report_templates_tenant ON report_templates(tenant_id);
CREATE INDEX idx_generated_reports_tenant ON generated_reports(tenant_id);
CREATE INDEX idx_generated_reports_template ON generated_reports(template_id);
CREATE INDEX idx_custom_dashboards_tenant ON custom_dashboards(tenant_id);
CREATE INDEX idx_dashboard_widgets_dashboard ON dashboard_widgets(dashboard_id);
CREATE INDEX idx_analytics_aggregations_lookup ON analytics_aggregations(tenant_id, aggregation_type, period_start);
CREATE INDEX idx_kpi_definitions_tenant ON kpi_definitions(tenant_id);
CREATE INDEX idx_kpi_values_lookup ON kpi_values(kpi_id, period_date);
CREATE INDEX idx_report_schedules_tenant ON report_schedules(tenant_id);
CREATE INDEX idx_report_schedules_next_run ON report_schedules(next_run_at);
CREATE INDEX idx_data_exports_tenant ON data_exports(tenant_id);
CREATE INDEX idx_data_exports_status ON data_exports(status);
CREATE INDEX idx_custom_metrics_tenant ON custom_metrics(tenant_id);
CREATE INDEX idx_bi_cache_lookup ON bi_cache(cache_key, tenant_id);
CREATE INDEX idx_bi_cache_expires ON bi_cache(expires_at);

-- RLS Policies
ALTER TABLE gantt_chart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_aggregations ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi_cache ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies
CREATE POLICY gantt_chart_tenant_policy ON gantt_chart_items
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY report_templates_access_policy ON report_templates
  FOR ALL USING (
    is_public = true OR
    is_system = true OR
    tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
  );

CREATE POLICY generated_reports_tenant_policy ON generated_reports
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY custom_dashboards_tenant_policy ON custom_dashboards
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));
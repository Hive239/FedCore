-- Fix Architecture Analysis Schema and Add Data
-- This script ensures all tables have the correct structure and sample data

-- 1. Fix compliance_tracking table - remove constraint and recreate
ALTER TABLE IF EXISTS compliance_tracking 
DROP CONSTRAINT IF EXISTS compliance_tracking_framework_check;

-- Insert compliance data with construction-relevant frameworks
INSERT INTO compliance_tracking (tenant_id, framework, compliant, compliance_percentage, controls_passed, controls_total)
VALUES 
  ('1cff47db-35dc-4b34-97b2-55752727414c', 'OSHA Safety', true, 92, 23, 25),
  ('1cff47db-35dc-4b34-97b2-55752727414c', 'ISO 9001', true, 88, 22, 25),
  ('1cff47db-35dc-4b34-97b2-55752727414c', 'LEED Certification', false, 65, 13, 20),
  ('1cff47db-35dc-4b34-97b2-55752727414c', 'Building Code Compliance', true, 100, 30, 30),
  ('1cff47db-35dc-4b34-97b2-55752727414c', 'Environmental Standards', false, 72, 18, 25)
ON CONFLICT DO NOTHING;

-- 2. Add more comprehensive report data
UPDATE architecture_analysis_reports 
SET report_data = jsonb_build_object(
  'codeQuality', jsonb_build_object(
    'cyclomaticComplexity', 8.5,
    'maintainabilityIndex', 82.3,
    'technicalDebt', 45,
    'testCoverage', 73,
    'documentationCoverage', 65,
    'linesOfCode', 15420
  ),
  'security', jsonb_build_object(
    'vulnerabilities', jsonb_build_array(
      jsonb_build_object(
        'severity', 'high',
        'type', 'XSS Vulnerability',
        'file', '/components/UserProfile.tsx',
        'description', 'Potential XSS in user input rendering'
      ),
      jsonb_build_object(
        'severity', 'critical',
        'type', 'SQL Injection',
        'file', '/api/search/route.ts',
        'description', 'Unsanitized input in database query'
      ),
      jsonb_build_object(
        'severity', 'medium',
        'type', 'Weak Authentication',
        'file', '/api/auth/route.ts',
        'description', 'Session timeout too long'
      )
    ),
    'securityScore', 72
  ),
  'architectureMetrics', jsonb_build_object(
    'modularity', 85,
    'coupling', 78,
    'cohesion', 82,
    'scalability', 80
  ),
  'dependencies', jsonb_build_object(
    'outdated', jsonb_build_array(
      jsonb_build_object('name', 'react', 'current', '^17.0.0', 'latest', '18.2.0', 'vulnerability', false),
      jsonb_build_object('name', 'next', 'current', '14.0.0', 'latest', '15.3.5', 'vulnerability', false),
      jsonb_build_object('name', 'lodash', 'current', '^4.17.19', 'latest', '4.17.21', 'vulnerability', true),
      jsonb_build_object('name', 'axios', 'current', '0.21.0', 'latest', '1.7.0', 'vulnerability', true),
      jsonb_build_object('name', 'moment', 'current', '2.29.0', 'latest', '2.30.0', 'vulnerability', false)
    ),
    'unused', jsonb_build_array('jquery', 'underscore', 'bootstrap', 'popper.js')
  ),
  'mlInsights', jsonb_build_object(
    'patterns', jsonb_build_array(
      jsonb_build_object(
        'pattern', 'Frequent database queries in loops',
        'frequency', 23,
        'impact', 'negative',
        'confidence', 0.87
      ),
      jsonb_build_object(
        'pattern', 'Consistent error handling patterns',
        'frequency', 45,
        'impact', 'positive',
        'confidence', 0.92
      ),
      jsonb_build_object(
        'pattern', 'Component reusability high',
        'frequency', 67,
        'impact', 'positive',
        'confidence', 0.89
      ),
      jsonb_build_object(
        'pattern', 'API response caching implemented',
        'frequency', 34,
        'impact', 'positive',
        'confidence', 0.95
      )
    ),
    'predictions', jsonb_build_array(
      jsonb_build_object('metric', 'complexity', 'current', 8.5, 'predicted30Days', 9.2, 'confidence', 0.78),
      jsonb_build_object('metric', 'performance', 'current', 125, 'predicted30Days', 118, 'confidence', 0.82),
      jsonb_build_object('metric', 'security', 'current', 72, 'predicted30Days', 75, 'confidence', 0.75),
      jsonb_build_object('metric', 'reliability', 'current', 94, 'predicted30Days', 96, 'confidence', 0.88)
    ),
    'anomalies', jsonb_build_array(
      jsonb_build_object(
        'type', 'Performance Spike',
        'severity', 'medium',
        'description', 'Response times increased by 40% in the last week'
      ),
      jsonb_build_object(
        'type', 'Error Rate Increase',
        'severity', 'high',
        'description', 'JavaScript errors increased by 60% after latest deployment'
      ),
      jsonb_build_object(
        'type', 'Memory Usage',
        'severity', 'low',
        'description', 'Slight increase in memory consumption detected'
      )
    )
  ),
  'recommendations', jsonb_build_object(
    'immediate', jsonb_build_array(
      'Fix critical SQL injection vulnerability in search API',
      'Update lodash and axios to resolve security vulnerabilities',
      'Implement proper input sanitization for XSS prevention',
      'Add rate limiting to prevent API abuse'
    ),
    'shortTerm', jsonb_build_array(
      'Increase test coverage from 73% to 85%',
      'Refactor database query patterns to reduce N+1 queries',
      'Implement comprehensive error logging system',
      'Set up automated security scanning in CI/CD pipeline',
      'Remove unused dependencies to reduce bundle size'
    ),
    'longTerm', jsonb_build_array(
      'Migrate to React 18 for performance improvements',
      'Implement comprehensive security audit program',
      'Establish automated dependency vulnerability scanning',
      'Refactor to microservices architecture for better scalability',
      'Implement full end-to-end testing suite'
    )
  )
)
WHERE id LIKE 'analysis-%';

-- 3. Add more security vulnerabilities
INSERT INTO security_vulnerabilities (
  tenant_id, vulnerability_type, severity, status, description, 
  file_path, line_number, cwe_id, owasp_category, remediation,
  exploitability_score, impact_score
) VALUES 
  ('1cff47db-35dc-4b34-97b2-55752727414c', 'Insecure Direct Object Reference', 'high', 'open', 
   'User can access other users data by changing ID in URL', '/api/user/[id]/route.ts', 45, 
   'CWE-639', 'A01:2021 – Broken Access Control', 'Implement proper authorization checks', 8.5, 7.2),
  ('1cff47db-35dc-4b34-97b2-55752727414c', 'Missing Rate Limiting', 'medium', 'open',
   'API endpoints lack rate limiting', '/api/*/route.ts', 0,
   'CWE-770', 'A06:2021 – Vulnerable Components', 'Implement rate limiting middleware', 6.0, 5.0),
  ('1cff47db-35dc-4b34-97b2-55752727414c', 'Hardcoded Credentials', 'critical', 'open',
   'Database credentials found in source code', '/config/database.ts', 12,
   'CWE-798', 'A07:2021 – Identification Failures', 'Move credentials to environment variables', 9.8, 9.0)
ON CONFLICT DO NOTHING;

-- 4. Add more performance logs
INSERT INTO performance_logs (tenant_id, user_id, endpoint, method, response_time, status_code, timestamp)
SELECT 
  '1cff47db-35dc-4b34-97b2-55752727414c',
  '13893701-4316-4c04-b864-8ec8b1cf4907',
  endpoints.endpoint,
  'GET',
  50 + random() * 450,
  CASE WHEN random() > 0.95 THEN 500 ELSE 200 END,
  NOW() - (random() * interval '7 days')
FROM (
  VALUES 
    ('/api/dashboard'),
    ('/api/projects'),
    ('/api/tasks'),
    ('/api/reports'),
    ('/api/analytics'),
    ('/api/users'),
    ('/api/settings'),
    ('/api/upload'),
    ('/api/export'),
    ('/api/notifications')
) AS endpoints(endpoint),
generate_series(1, 3)
ON CONFLICT DO NOTHING;

-- 5. Add more error logs
INSERT INTO error_logs (tenant_id, user_id, error_type, error_message, error_stack, page_url, severity)
VALUES 
  ('1cff47db-35dc-4b34-97b2-55752727414c', '13893701-4316-4c04-b864-8ec8b1cf4907',
   'TypeError', 'Cannot read properties of null', 'at Dashboard.render()', '/dashboard', 'medium'),
  ('1cff47db-35dc-4b34-97b2-55752727414c', '13893701-4316-4c04-b864-8ec8b1cf4907',
   'NetworkError', 'Failed to fetch resource', 'at fetchData()', '/api/data', 'high'),
  ('1cff47db-35dc-4b34-97b2-55752727414c', '13893701-4316-4c04-b864-8ec8b1cf4907',
   'ReferenceError', 'Variable is not defined', 'at calculateMetrics()', '/reports', 'low')
ON CONFLICT DO NOTHING;

-- 6. Add activity logs if not enough
INSERT INTO activity_logs (tenant_id, user_id, action, resource_type, resource_id)
SELECT 
  '1cff47db-35dc-4b34-97b2-55752727414c',
  '13893701-4316-4c04-b864-8ec8b1cf4907',
  actions.action,
  'project',
  gen_random_uuid()::text
FROM (
  VALUES ('created'), ('updated'), ('deleted'), ('viewed'), ('exported')
) AS actions(action),
generate_series(1, 10)
ON CONFLICT DO NOTHING;
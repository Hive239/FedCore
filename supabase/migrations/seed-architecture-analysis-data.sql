-- ============================================
-- Seed Architecture Analysis Data
-- Populate tables with realistic data for the dashboard
-- ============================================

-- Get the first tenant for seeding data
DO $$
DECLARE
  test_tenant_id UUID;
  test_user_id UUID;
  report_id TEXT;
BEGIN
  -- Get first tenant and user for testing
  SELECT id INTO test_tenant_id FROM public.tenants LIMIT 1;
  SELECT id INTO test_user_id FROM public.profiles LIMIT 1;
  
  IF test_tenant_id IS NULL OR test_user_id IS NULL THEN
    RAISE NOTICE 'No tenant or user found. Please ensure you have tenants and users set up first.';
    RETURN;
  END IF;

  -- 1. Insert sample performance logs
  INSERT INTO public.performance_logs (tenant_id, user_id, endpoint, method, response_time, status_code, timestamp) VALUES
  (test_tenant_id, test_user_id, '/api/projects', 'GET', 125, 200, NOW() - INTERVAL '1 hour'),
  (test_tenant_id, test_user_id, '/api/tasks', 'GET', 89, 200, NOW() - INTERVAL '2 hours'),
  (test_tenant_id, test_user_id, '/api/architecture/analyze', 'POST', 2350, 200, NOW() - INTERVAL '3 hours'),
  (test_tenant_id, test_user_id, '/api/users', 'GET', 67, 200, NOW() - INTERVAL '4 hours'),
  (test_tenant_id, test_user_id, '/api/projects', 'POST', 234, 201, NOW() - INTERVAL '5 hours'),
  (test_tenant_id, test_user_id, '/api/dashboard/metrics', 'GET', 156, 200, NOW() - INTERVAL '6 hours'),
  (test_tenant_id, test_user_id, '/api/vendors', 'GET', 98, 200, NOW() - INTERVAL '7 hours'),
  (test_tenant_id, test_user_id, '/api/projects/123', 'PUT', 345, 200, NOW() - INTERVAL '8 hours'),
  (test_tenant_id, test_user_id, '/api/tasks/search', 'GET', 567, 200, NOW() - INTERVAL '9 hours'),
  (test_tenant_id, test_user_id, '/api/upload', 'POST', 1250, 200, NOW() - INTERVAL '10 hours'),
  (test_tenant_id, test_user_id, '/api/reports', 'GET', 189, 200, NOW() - INTERVAL '11 hours'),
  (test_tenant_id, test_user_id, '/api/settings', 'GET', 76, 200, NOW() - INTERVAL '12 hours'),
  (test_tenant_id, test_user_id, '/api/auth/me', 'GET', 45, 200, NOW() - INTERVAL '1 day'),
  (test_tenant_id, test_user_id, '/api/notifications', 'GET', 123, 200, NOW() - INTERVAL '1 day 1 hour'),
  (test_tenant_id, test_user_id, '/api/analytics', 'GET', 678, 200, NOW() - INTERVAL '1 day 2 hours');

  -- 2. Insert sample error logs
  INSERT INTO public.error_logs (tenant_id, user_id, error_type, error_message, error_stack, page_url, severity) VALUES
  (test_tenant_id, test_user_id, 'javascript', 'Cannot read property of undefined', 'TypeError: Cannot read property ''name'' of undefined\n    at Component.render (/dashboard/projects)', '/dashboard/projects', 'medium'),
  (test_tenant_id, test_user_id, 'network', 'Failed to fetch', 'NetworkError: Failed to fetch from /api/tasks', '/dashboard/tasks', 'high'),
  (test_tenant_id, test_user_id, 'api', 'Database connection timeout', 'Error: connect ETIMEDOUT\n    at Database.connect', '/api/projects', 'critical'),
  (test_tenant_id, test_user_id, 'javascript', 'React Hook useEffect has a missing dependency', 'Warning: React Hook useEffect has a missing dependency: ''project''', '/dashboard/gantt', 'low'),
  (test_tenant_id, test_user_id, 'api', 'Unauthorized access attempt', '401 Unauthorized - Invalid JWT token', '/api/admin/users', 'high');

  -- 3. Insert sample security vulnerabilities
  INSERT INTO public.security_vulnerabilities (
    tenant_id, vulnerability_type, severity, status, description, file_path, line_number, 
    cwe_id, owasp_category, remediation, exploitability_score, impact_score
  ) VALUES
  (test_tenant_id, 'XSS Vulnerability', 'high', 'open', 'Potential XSS in user input rendering', '/components/UserProfile.tsx', 45, 'CWE-79', 'A03:2021 – Injection', 'Sanitize user input before rendering', 7.5, 6.8),
  (test_tenant_id, 'SQL Injection', 'critical', 'open', 'Unsanitized input in database query', '/api/search/route.ts', 23, 'CWE-89', 'A03:2021 – Injection', 'Use parameterized queries', 9.2, 8.5),
  (test_tenant_id, 'Weak Cryptography', 'medium', 'in_progress', 'Use of MD5 hashing algorithm', '/lib/crypto.ts', 12, 'CWE-327', 'A02:2021 – Cryptographic Failures', 'Upgrade to SHA-256 or bcrypt', 5.5, 4.2),
  (test_tenant_id, 'Sensitive Data Exposure', 'high', 'open', 'API keys in client-side code', '/config/api.ts', 8, 'CWE-200', 'A01:2021 – Broken Access Control', 'Move API keys to environment variables', 8.0, 7.3),
  (test_tenant_id, 'CSRF Vulnerability', 'medium', 'resolved', 'Missing CSRF protection on forms', '/api/admin/route.ts', 34, 'CWE-352', 'A01:2021 – Broken Access Control', 'Implement CSRF tokens', 6.0, 5.5);

  -- 4. Insert compliance tracking data
  INSERT INTO public.compliance_tracking (
    tenant_id, framework, compliant, compliance_percentage, controls_passed, controls_total,
    last_audit_date, next_audit_date
  ) VALUES
  (test_tenant_id, 'SOC 2', false, 75, 18, 24, NOW() - INTERVAL '6 months', NOW() + INTERVAL '6 months'),
  (test_tenant_id, 'GDPR', true, 95, 28, 30, NOW() - INTERVAL '3 months', NOW() + INTERVAL '9 months'),
  (test_tenant_id, 'HIPAA', false, 60, 15, 25, NOW() - INTERVAL '8 months', NOW() + INTERVAL '4 months'),
  (test_tenant_id, 'ISO 27001', true, 88, 22, 25, NOW() - INTERVAL '2 months', NOW() + INTERVAL '10 months'),
  (test_tenant_id, 'PCI DSS', false, 40, 8, 20, NOW() - INTERVAL '12 months', NOW() + INTERVAL '1 month');

  -- 5. Insert comprehensive architecture analysis report
  report_id := 'analysis-' || extract(epoch from now())::text;
  
  INSERT INTO public.architecture_analysis_reports (
    id, tenant_id, production_readiness_score, report_data, analyzed_by, created_by
  ) VALUES (
    report_id,
    test_tenant_id,
    78,
    jsonb_build_object(
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
          jsonb_build_object('name', 'lodash', 'current', '^4.17.19', 'latest', '4.17.21', 'vulnerability', true),
          jsonb_build_object('name', 'express', 'current', '^4.18.0', 'latest', '4.18.2', 'vulnerability', false)
        ),
        'unused', jsonb_build_array('moment', 'jquery', 'underscore')
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
          )
        ),
        'predictions', jsonb_build_array(
          jsonb_build_object('metric', 'complexity', 'current', 8.5, 'predicted30Days', 9.2, 'confidence', 0.78),
          jsonb_build_object('metric', 'performance', 'current', 125, 'predicted30Days', 118, 'confidence', 0.82),
          jsonb_build_object('metric', 'security', 'current', 72, 'predicted30Days', 75, 'confidence', 0.75)
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
          )
        )
      ),
      'recommendations', jsonb_build_object(
        'immediate', jsonb_build_array(
          'Fix critical SQL injection vulnerability in search API',
          'Update lodash dependency to resolve security vulnerability',
          'Implement proper input sanitization for XSS prevention'
        ),
        'shortTerm', jsonb_build_array(
          'Increase test coverage from 73% to 85%',
          'Refactor database query patterns to reduce N+1 queries',
          'Implement comprehensive error logging system'
        ),
        'longTerm', jsonb_build_array(
          'Migrate to React 18 for performance improvements',
          'Implement comprehensive security audit program',
          'Establish automated dependency vulnerability scanning'
        )
      )
    ),
    'system',
    test_user_id
  );

  RAISE NOTICE 'Successfully seeded architecture analysis data for tenant %', test_tenant_id;
  RAISE NOTICE 'Created analysis report with ID: %', report_id;

END $$;
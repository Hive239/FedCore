-- Add sample Nexus data for testing
-- This script adds sample data to demonstrate Nexus Engine functionality

-- Get tenant_id for the current user
DO $$
DECLARE
  v_tenant_id UUID;
  v_user_id UUID;
  v_project_id UUID;
BEGIN
  -- Get first tenant and user
  SELECT tenant_id, user_id INTO v_tenant_id, v_user_id
  FROM user_tenants
  LIMIT 1;
  
  -- Get first project
  SELECT id INTO v_project_id
  FROM projects
  WHERE tenant_id = v_tenant_id
  LIMIT 1;
  
  -- Only proceed if we have valid data
  IF v_tenant_id IS NOT NULL AND v_user_id IS NOT NULL THEN
    
    -- Insert sample productivity metrics
    INSERT INTO productivity_metrics (
      tenant_id, project_id, user_id, date_calculated,
      task_completion_rate, average_task_duration, quality_score, 
      efficiency_score, productivity_score, metrics_data
    ) VALUES 
    (
      v_tenant_id, v_project_id, v_user_id, CURRENT_DATE,
      0.85, 2.5, 0.90, 0.88, 0.87,
      '{"tasks_completed": 24, "tasks_total": 28, "rework_rate": 0.05}'::jsonb
    ),
    (
      v_tenant_id, v_project_id, v_user_id, CURRENT_DATE - INTERVAL '1 day',
      0.82, 2.8, 0.88, 0.85, 0.85,
      '{"tasks_completed": 21, "tasks_total": 26, "rework_rate": 0.07}'::jsonb
    )
    ON CONFLICT (project_id, user_id, date_calculated) DO UPDATE
    SET productivity_score = EXCLUDED.productivity_score;
    
    -- Insert sample schedule conflicts
    INSERT INTO schedule_conflicts (
      tenant_id, project_id, conflict_type, severity,
      affected_tasks, conflict_data, suggested_resolution, status
    ) VALUES 
    (
      v_tenant_id, v_project_id, 'resource_overlap', 'high',
      ARRAY[]::UUID[],
      '{"description": "Electrical and plumbing crews scheduled simultaneously in Zone A", "resources": ["Electrical Team", "Plumbing Team"], "date": "2025-08-26"}'::jsonb,
      '{"action": "Reschedule plumbing to next day", "impact": "1 day delay for plumbing"}'::jsonb,
      'open'
    ),
    (
      v_tenant_id, v_project_id, 'dependency_violation', 'medium',
      ARRAY[]::UUID[],
      '{"description": "Drywall scheduled before electrical inspection", "dependency": "Electrical inspection must complete before drywall"}'::jsonb,
      '{"action": "Delay drywall by 2 days", "impact": "No impact on critical path"}'::jsonb,
      'open'
    );
    
    -- Insert sample Nexus insights
    INSERT INTO nexus_insights (
      tenant_id, project_id, insight_type, priority,
      title, description, confidence_score, status
    ) VALUES 
    (
      v_tenant_id, v_project_id, 'efficiency', 'medium',
      'High Task Completion Rate',
      'Your team is maintaining an 85% task completion rate. Consider increasing project velocity or taking on additional scope.',
      0.85, 'active'
    ),
    (
      v_tenant_id, v_project_id, 'warning', 'high',
      'Resource Allocation Imbalance',
      'Phase A has 70% of resources while Phase B is understaffed. Consider rebalancing to prevent bottlenecks.',
      0.78, 'active'
    ),
    (
      v_tenant_id, v_project_id, 'opportunity', 'low',
      'Schedule Optimization Available',
      'Combining inspections for electrical and HVAC could save 2 days on the project timeline.',
      0.92, 'active'
    );
    
    -- Insert sample weather data (if location is available)
    INSERT INTO weather_data (
      location_hash, latitude, longitude, weather_date,
      temperature_high, temperature_low, precipitation, wind_speed,
      conditions, construction_risk_score, impact_description
    ) VALUES 
    (
      'default_location', 26.1420, -81.7948, CURRENT_DATE + INTERVAL '1 day',
      88, 75, 0.1, 10,
      'Partly Cloudy', 20, 'Good conditions for outdoor work'
    ),
    (
      'default_location', 26.1420, -81.7948, CURRENT_DATE + INTERVAL '2 days',
      85, 73, 2.5, 25,
      'Thunderstorms', 75, 'Heavy rain expected - reschedule outdoor activities'
    ),
    (
      'default_location', 26.1420, -81.7948, CURRENT_DATE + INTERVAL '3 days',
      82, 70, 0.5, 15,
      'Light Rain', 45, 'Light precipitation - monitor conditions'
    )
    ON CONFLICT (location_hash, weather_date) DO UPDATE
    SET construction_risk_score = EXCLUDED.construction_risk_score;
    
    RAISE NOTICE 'Sample Nexus data added successfully for tenant %', v_tenant_id;
  ELSE
    RAISE NOTICE 'No valid tenant/user found. Please ensure you have logged in at least once.';
  END IF;
END $$;
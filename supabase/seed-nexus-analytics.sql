-- ============================================
-- Seed Nexus AI Analytics Data
-- ============================================

DO $$
DECLARE
  v_tenant_id UUID;
  v_project RECORD;
  v_user RECORD;
  v_date DATE;
  v_productivity_score INTEGER;
BEGIN
  -- Get Meridian Contracting tenant
  SELECT id INTO v_tenant_id
  FROM public.tenants
  WHERE slug = 'meridian-contracting' 
     OR name = 'Meridian Contracting'
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE NOTICE 'Meridian Contracting tenant not found. Creating analytics for all tenants...';
    
    -- Loop through all tenants
    FOR v_tenant_id IN SELECT id FROM public.tenants
    LOOP
      RAISE NOTICE 'Creating analytics for tenant: %', v_tenant_id;
      
      -- Create Nexus Analytics entries for each project
      FOR v_project IN 
        SELECT id, name 
        FROM public.projects 
        WHERE tenant_id = v_tenant_id
        LIMIT 10
      LOOP
        -- Create multiple analytics entries over time
        FOR i IN 0..29 LOOP
          v_date := CURRENT_DATE - INTERVAL '1 day' * i;
          v_productivity_score := 70 + (RANDOM() * 25)::INTEGER;
          
          INSERT INTO public.nexus_analytics (
            tenant_id,
            project_id,
            productivity_score,
            schedule_accuracy,
            conflicts_detected,
            ml_confidence,
            resource_utilization,
            performance_trend,
            created_at,
            updated_at
          ) VALUES (
            v_tenant_id,
            v_project.id,
            v_productivity_score,
            75 + (RANDOM() * 20)::INTEGER,  -- schedule_accuracy
            (RANDOM() * 5)::INTEGER,          -- conflicts_detected
            85 + (RANDOM() * 10)::INTEGER,    -- ml_confidence
            60 + (RANDOM() * 35)::INTEGER,    -- resource_utilization
            CASE 
              WHEN v_productivity_score > 85 THEN 'up'
              WHEN v_productivity_score < 75 THEN 'down'
              ELSE 'stable'
            END,
            v_date::TIMESTAMPTZ,
            v_date::TIMESTAMPTZ
          );
        END LOOP;
        
        RAISE NOTICE '  ✓ Created analytics for project: %', v_project.name;
      END LOOP;
      
      -- Create Productivity Metrics for users
      FOR v_user IN 
        SELECT ut.user_id, p.id as profile_id
        FROM public.user_tenants ut
        LEFT JOIN public.profiles p ON p.id = ut.user_id
        WHERE ut.tenant_id = v_tenant_id
        LIMIT 10
      LOOP
        FOR i IN 0..29 LOOP
          v_date := CURRENT_DATE - INTERVAL '1 day' * i;
          
          -- Skip weekends
          IF EXTRACT(DOW FROM v_date) IN (0, 6) THEN
            CONTINUE;
          END IF;
          
          INSERT INTO public.productivity_metrics (
            tenant_id,
            user_id,
            project_id,
            date,
            tasks_completed,
            hours_worked,
            productivity_score,
            avg_task_duration,
            quality_rating,
            created_at
          ) 
          SELECT
            v_tenant_id,
            v_user.user_id,
            p.id,
            v_date,
            3 + (RANDOM() * 7)::INTEGER,      -- tasks_completed
            6 + (RANDOM() * 3)::NUMERIC,      -- hours_worked
            70 + (RANDOM() * 25)::INTEGER,    -- productivity_score
            0.5 + (RANDOM() * 2)::NUMERIC,    -- avg_task_duration
            3 + (RANDOM() * 2)::INTEGER,      -- quality_rating
            v_date::TIMESTAMPTZ
          FROM public.projects p
          WHERE p.tenant_id = v_tenant_id
          LIMIT 1;
        END LOOP;
      END LOOP;
      
      -- Create Weather Risk predictions
      FOR v_project IN 
        SELECT id, name 
        FROM public.projects 
        WHERE tenant_id = v_tenant_id
        LIMIT 5
      LOOP
        FOR i IN 0..14 LOOP  -- Next 14 days
          v_date := CURRENT_DATE + INTERVAL '1 day' * i;
          
          -- Random weather risk (20% chance of risk)
          IF RANDOM() < 0.2 THEN
            INSERT INTO public.weather_risks (
              tenant_id,
              project_id,
              date,
              risk_level,
              impact_description,
              tasks_affected,
              weather_condition,
              temperature_range,
              precipitation_chance,
              wind_speed,
              created_at
            ) VALUES (
              v_tenant_id,
              v_project.id,
              v_date,
              CASE 
                WHEN RANDOM() < 0.3 THEN 'high'
                WHEN RANDOM() < 0.6 THEN 'medium'
                ELSE 'low'
              END,
              CASE 
                WHEN RANDOM() < 0.3 THEN 'Heavy rain may delay outdoor work'
                WHEN RANDOM() < 0.6 THEN 'High winds could affect crane operations'
                ELSE 'Light precipitation possible'
              END,
              (RANDOM() * 5 + 1)::INTEGER,
              CASE 
                WHEN RANDOM() < 0.3 THEN 'Heavy Rain'
                WHEN RANDOM() < 0.5 THEN 'Thunderstorms'
                WHEN RANDOM() < 0.7 THEN 'High Winds'
                ELSE 'Overcast'
              END,
              (60 + RANDOM() * 30)::INTEGER || '-' || (70 + RANDOM() * 30)::INTEGER || '°F',
              (20 + RANDOM() * 60)::INTEGER,
              (5 + RANDOM() * 25)::INTEGER,
              NOW()
            );
          END IF;
        END LOOP;
      END LOOP;
      
      RAISE NOTICE '✅ Analytics data created for tenant';
    END LOOP;
  ELSE
    -- Create analytics specifically for Meridian Contracting
    RAISE NOTICE 'Creating analytics for Meridian Contracting: %', v_tenant_id;
    
    -- Similar logic as above but just for one tenant
    FOR v_project IN 
      SELECT id, name 
      FROM public.projects 
      WHERE tenant_id = v_tenant_id
      LIMIT 10
    LOOP
      FOR i IN 0..29 LOOP
        v_date := CURRENT_DATE - INTERVAL '1 day' * i;
        v_productivity_score := 70 + (RANDOM() * 25)::INTEGER;
        
        INSERT INTO public.nexus_analytics (
          tenant_id,
          project_id,
          productivity_score,
          schedule_accuracy,
          conflicts_detected,
          ml_confidence,
          resource_utilization,
          performance_trend,
          created_at,
          updated_at
        ) VALUES (
          v_tenant_id,
          v_project.id,
          v_productivity_score,
          75 + (RANDOM() * 20)::INTEGER,
          (RANDOM() * 5)::INTEGER,
          85 + (RANDOM() * 10)::INTEGER,
          60 + (RANDOM() * 35)::INTEGER,
          CASE 
            WHEN v_productivity_score > 85 THEN 'up'
            WHEN v_productivity_score < 75 THEN 'down'
            ELSE 'stable'
          END,
          v_date::TIMESTAMPTZ,
          v_date::TIMESTAMPTZ
        );
      END LOOP;
      
      RAISE NOTICE '  ✓ Created analytics for project: %', v_project.name;
    END LOOP;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '======================================';
  RAISE NOTICE '✅ Nexus AI Analytics data seeded successfully!';
  RAISE NOTICE '======================================';
  RAISE NOTICE '';
  RAISE NOTICE 'The dashboard will now show:';
  RAISE NOTICE '  • Live productivity scores';
  RAISE NOTICE '  • Schedule accuracy metrics';
  RAISE NOTICE '  • ML confidence levels';
  RAISE NOTICE '  • Resource utilization';
  RAISE NOTICE '  • Weather risk predictions';
  RAISE NOTICE '  • Performance trends';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error: %', SQLERRM;
    RAISE;
END $$;
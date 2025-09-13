-- Add work_location to calendar_events
ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS work_location VARCHAR(50);

-- Add sample event with work location
DO $$
DECLARE
    tenant_uuid UUID;
    project_uuid UUID;
BEGIN
    SELECT id INTO tenant_uuid FROM tenants LIMIT 1;
    SELECT id INTO project_uuid FROM projects WHERE tenant_id = tenant_uuid LIMIT 1;
    
    IF tenant_uuid IS NOT NULL THEN
        INSERT INTO calendar_events (
            tenant_id,
            project_id,
            title,
            description,
            start_time,
            end_time,
            work_location,
            created_by,
            created_at
        )
        SELECT 
            tenant_uuid,
            project_uuid,
            'Concrete Pour - Foundation',
            'Foundation concrete pour - weather dependent',
            CURRENT_TIMESTAMP + INTERVAL '2 days',
            CURRENT_TIMESTAMP + INTERVAL '2 days 8 hours',
            'exterior',
            (SELECT id FROM users LIMIT 1),
            CURRENT_TIMESTAMP
        WHERE NOT EXISTS (
            SELECT 1 FROM calendar_events 
            WHERE title = 'Concrete Pour - Foundation'
            LIMIT 1
        );
        
        INSERT INTO calendar_events (
            tenant_id,
            project_id,
            title,
            description,
            start_time,
            end_time,
            work_location,
            created_by,
            created_at
        )
        SELECT 
            tenant_uuid,
            project_uuid,
            'Electrical Rough-In',
            'Interior electrical work',
            CURRENT_TIMESTAMP + INTERVAL '5 days',
            CURRENT_TIMESTAMP + INTERVAL '5 days 6 hours',
            'interior',
            (SELECT id FROM users LIMIT 1),
            CURRENT_TIMESTAMP
        WHERE NOT EXISTS (
            SELECT 1 FROM calendar_events 
            WHERE title = 'Electrical Rough-In'
            LIMIT 1
        );
    END IF;
END $$;

SELECT '✅ Work location added to calendar events' as status;

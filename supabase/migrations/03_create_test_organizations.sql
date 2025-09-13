-- Create 3 Test Organizations and Assign Users
-- This creates organizations for testing data input

-- Step 1: Create 3 different organizations
DO $$
DECLARE
    org1_id UUID;
    org2_id UUID;
    org3_id UUID;
    user1_id UUID;
    user2_id UUID;
    user3_id UUID;
BEGIN
    -- Create Organization 1: Construction Company
    INSERT INTO tenants (
        name, 
        slug, 
        status, 
        subscription_tier,
        max_users,
        max_projects,
        settings,
        created_at, 
        updated_at
    )
    VALUES (
        'ABC Construction Co', 
        'abc-construction-' || substr(gen_random_uuid()::text, 1, 8), 
        'active',
        'pro',
        20,
        50,
        '{"industry": "construction", "specialties": ["commercial", "residential"]}',
        NOW(), 
        NOW()
    )
    RETURNING id INTO org1_id;
    
    RAISE NOTICE 'Created Organization 1: ABC Construction Co (ID: %)', org1_id;

    -- Create Organization 2: Architectural Firm
    INSERT INTO tenants (
        name, 
        slug, 
        status, 
        subscription_tier,
        max_users,
        max_projects,
        settings,
        created_at, 
        updated_at
    )
    VALUES (
        'Modern Design Studio', 
        'modern-design-' || substr(gen_random_uuid()::text, 1, 8), 
        'active',
        'pro',
        15,
        30,
        '{"industry": "architecture", "specialties": ["modern", "sustainable"]}',
        NOW(), 
        NOW()
    )
    RETURNING id INTO org2_id;
    
    RAISE NOTICE 'Created Organization 2: Modern Design Studio (ID: %)', org2_id;

    -- Create Organization 3: Property Development
    INSERT INTO tenants (
        name, 
        slug, 
        status, 
        subscription_tier,
        max_users,
        max_projects,
        settings,
        created_at, 
        updated_at
    )
    VALUES (
        'Premier Property Developers', 
        'premier-property-' || substr(gen_random_uuid()::text, 1, 8), 
        'active',
        'enterprise',
        50,
        100,
        '{"industry": "development", "specialties": ["commercial", "mixed-use"]}',
        NOW(), 
        NOW()
    )
    RETURNING id INTO org3_id;
    
    RAISE NOTICE 'Created Organization 3: Premier Property Developers (ID: %)', org3_id;

    -- Step 2: Get user IDs by email (replace these with your actual user emails)
    -- You'll need to update these email addresses to match your actual users
    
    -- Example: Assign first user to Organization 1 as owner
    SELECT id INTO user1_id FROM auth.users 
    WHERE email = 'user1@example.com' -- REPLACE WITH YOUR FIRST USER EMAIL
    LIMIT 1;
    
    IF user1_id IS NOT NULL THEN
        -- Remove from default organization first
        DELETE FROM user_tenants WHERE user_id = user1_id;
        
        -- Add to new organization as owner
        INSERT INTO user_tenants (user_id, tenant_id, role, created_at, updated_at)
        VALUES (user1_id, org1_id, 'owner', NOW(), NOW());
        
        RAISE NOTICE 'Assigned user1 to ABC Construction Co as owner';
    END IF;

    -- Example: Assign second user to Organization 2 as owner
    SELECT id INTO user2_id FROM auth.users 
    WHERE email = 'user2@example.com' -- REPLACE WITH YOUR SECOND USER EMAIL
    LIMIT 1;
    
    IF user2_id IS NOT NULL THEN
        -- Remove from default organization first
        DELETE FROM user_tenants WHERE user_id = user2_id;
        
        -- Add to new organization as owner
        INSERT INTO user_tenants (user_id, tenant_id, role, created_at, updated_at)
        VALUES (user2_id, org2_id, 'owner', NOW(), NOW());
        
        RAISE NOTICE 'Assigned user2 to Modern Design Studio as owner';
    END IF;

    -- Example: Assign third user to Organization 3 as owner
    SELECT id INTO user3_id FROM auth.users 
    WHERE email = 'user3@example.com' -- REPLACE WITH YOUR THIRD USER EMAIL
    LIMIT 1;
    
    IF user3_id IS NOT NULL THEN
        -- Remove from default organization first
        DELETE FROM user_tenants WHERE user_id = user3_id;
        
        -- Add to new organization as owner
        INSERT INTO user_tenants (user_id, tenant_id, role, created_at, updated_at)
        VALUES (user3_id, org3_id, 'owner', NOW(), NOW());
        
        RAISE NOTICE 'Assigned user3 to Premier Property Developers as owner';
    END IF;

END $$;

-- Step 3: Create some sample data for each organization

-- Add sample projects for each organization
INSERT INTO projects (
    name, 
    description, 
    status, 
    tenant_id,
    start_date,
    end_date,
    budget,
    created_by,
    created_at,
    updated_at
)
SELECT 
    'Office Complex Renovation',
    'Complete renovation of 5-story office building',
    'on-track',
    id,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '6 months',
    2500000,
    (SELECT user_id FROM user_tenants WHERE tenant_id = id AND role = 'owner' LIMIT 1),
    NOW(),
    NOW()
FROM tenants WHERE name = 'ABC Construction Co'
UNION ALL
SELECT 
    'Sustainable Housing Design',
    'Design for eco-friendly residential complex',
    'planning',
    id,
    CURRENT_DATE + INTERVAL '1 month',
    CURRENT_DATE + INTERVAL '4 months',
    750000,
    (SELECT user_id FROM user_tenants WHERE tenant_id = id AND role = 'owner' LIMIT 1),
    NOW(),
    NOW()
FROM tenants WHERE name = 'Modern Design Studio'
UNION ALL
SELECT 
    'Downtown Mixed-Use Development',
    'Large scale mixed commercial and residential project',
    'on-track',
    id,
    CURRENT_DATE - INTERVAL '2 months',
    CURRENT_DATE + INTERVAL '18 months',
    15000000,
    (SELECT user_id FROM user_tenants WHERE tenant_id = id AND role = 'owner' LIMIT 1),
    NOW(),
    NOW()
FROM tenants WHERE name = 'Premier Property Developers';

-- Step 4: Show the current user-organization assignments
SELECT 
    u.email as "User Email",
    t.name as "Organization",
    ut.role as "Role",
    t.subscription_tier as "Plan",
    t.max_projects as "Max Projects",
    ut.created_at::date as "Joined"
FROM auth.users u
JOIN user_tenants ut ON u.id = ut.user_id
JOIN tenants t ON ut.tenant_id = t.id
WHERE t.name != 'Default Organization'
ORDER BY t.name, ut.role;

-- Step 5: Show all organizations
SELECT 
    name as "Organization Name",
    subscription_tier as "Plan",
    max_users as "Max Users",
    max_projects as "Max Projects",
    (SELECT COUNT(*) FROM user_tenants WHERE tenant_id = tenants.id) as "Current Users",
    (SELECT COUNT(*) FROM projects WHERE tenant_id = tenants.id) as "Projects"
FROM tenants
WHERE name != 'Default Organization'
ORDER BY created_at DESC;
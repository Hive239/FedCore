-- Simple User Assignment to Organizations
-- First, let's see what users you have

-- Step 1: Show all current users and their assignments
SELECT 
    u.email,
    u.id,
    t.name as current_organization,
    ut.role
FROM auth.users u
LEFT JOIN user_tenants ut ON u.id = ut.user_id
LEFT JOIN tenants t ON ut.tenant_id = t.id
ORDER BY u.created_at;

-- Step 2: Create the 3 organizations (if they don't exist)
INSERT INTO tenants (name, slug, status, subscription_tier, max_users, max_projects, created_at, updated_at)
VALUES 
    ('ABC Construction Co', 'abc-construction', 'active', 'pro', 20, 50, NOW(), NOW()),
    ('Modern Design Studio', 'modern-design', 'active', 'pro', 15, 30, NOW(), NOW()),
    ('Premier Property Developers', 'premier-property', 'active', 'enterprise', 50, 100, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- Step 3: Manual assignment (uncomment and update with your actual emails)
-- Replace the email addresses with your actual user emails from Step 1 above

/*
-- Assign first user to ABC Construction Co
UPDATE user_tenants 
SET tenant_id = (SELECT id FROM tenants WHERE name = 'ABC Construction Co'),
    role = 'owner',
    updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_1@example.com');

-- Assign second user to Modern Design Studio
UPDATE user_tenants 
SET tenant_id = (SELECT id FROM tenants WHERE name = 'Modern Design Studio'),
    role = 'owner',
    updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_2@example.com');

-- Assign third user to Premier Property Developers
UPDATE user_tenants 
SET tenant_id = (SELECT id FROM tenants WHERE name = 'Premier Property Developers'),
    role = 'owner',
    updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_3@example.com');
*/

-- Alternative: If you want to assign by position (first 3 users)
DO $$
DECLARE
    users_cursor CURSOR FOR 
        SELECT id, email FROM auth.users 
        ORDER BY created_at 
        LIMIT 3;
    user_record RECORD;
    org_names TEXT[] := ARRAY['ABC Construction Co', 'Modern Design Studio', 'Premier Property Developers'];
    counter INT := 1;
BEGIN
    OPEN users_cursor;
    LOOP
        FETCH users_cursor INTO user_record;
        EXIT WHEN NOT FOUND;
        
        -- Update user's organization
        UPDATE user_tenants 
        SET tenant_id = (SELECT id FROM tenants WHERE name = org_names[counter]),
            role = 'owner',
            updated_at = NOW()
        WHERE user_id = user_record.id;
        
        RAISE NOTICE 'Assigned % to %', user_record.email, org_names[counter];
        
        counter := counter + 1;
    END LOOP;
    CLOSE users_cursor;
END $$;

-- Step 4: Verify assignments
SELECT 
    u.email as "User",
    t.name as "Organization",
    ut.role as "Role",
    t.subscription_tier as "Plan"
FROM auth.users u
JOIN user_tenants ut ON u.id = ut.user_id
JOIN tenants t ON ut.tenant_id = t.id
ORDER BY t.name;
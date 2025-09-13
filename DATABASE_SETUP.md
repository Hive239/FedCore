# Project Pro Database Setup Guide

This guide will help you set up the Project Pro database in Supabase.

## Step 1: Create the Database Schema

1. Go to your Supabase SQL Editor:
   ```
   https://supabase.com/dashboard/project/ndvlruqscfjsmpdojtnl/sql/new
   ```

2. Copy the entire contents of `supabase/complete-setup.sql`

3. Paste it in the SQL Editor and click **RUN**

4. You should see "Success. No rows returned" - this means the schema was created successfully

## Step 2: Create Test Users

1. Go to the Authentication section:
   ```
   https://supabase.com/dashboard/project/ndvlruqscfjsmpdojtnl/auth/users
   ```

2. Click **Add user** → **Create new user**

3. Create these test users (make sure to use these exact emails):
   - Email: `admin@projectpro.com`, Password: `Admin123!`
   - Email: `john@projectpro.com`, Password: `John123!`
   - Email: `jane@projectpro.com`, Password: `Jane123!`
   - Email: `bob@projectpro.com`, Password: `Bob123!`
   - Email: `sarah@projectpro.com`, Password: `Sarah123!`
   - Email: `mike@projectpro.com`, Password: `Mike123!`

4. For each user, make sure to:
   - Check "Auto Confirm User" 
   - Leave "Send email invite" unchecked

## Step 3: Link Users to Tenant

After creating the users, you need to link them to the test tenant.

1. Go back to the SQL Editor:
   ```
   https://supabase.com/dashboard/project/ndvlruqscfjsmpdojtnl/sql/new
   ```

2. Run this query to get the user IDs:
   ```sql
   SELECT id, email FROM auth.users WHERE email IN (
     'admin@projectpro.com',
     'john@projectpro.com',
     'jane@projectpro.com',
     'bob@projectpro.com',
     'sarah@projectpro.com',
     'mike@projectpro.com'
   );
   ```

3. Copy the user IDs from the results

4. Run this query to link users to the tenant (replace the UUIDs with the actual user IDs from step 3):
   ```sql
   INSERT INTO public.user_tenants (user_id, tenant_id, role) VALUES 
     ('YOUR-ADMIN-USER-ID', 'd0d0d0d0-0000-0000-0000-000000000001', 'owner'),
     ('YOUR-JOHN-USER-ID', 'd0d0d0d0-0000-0000-0000-000000000001', 'admin'),
     ('YOUR-JANE-USER-ID', 'd0d0d0d0-0000-0000-0000-000000000001', 'member'),
     ('YOUR-BOB-USER-ID', 'd0d0d0d0-0000-0000-0000-000000000001', 'member'),
     ('YOUR-SARAH-USER-ID', 'd0d0d0d0-0000-0000-0000-000000000001', 'member'),
     ('YOUR-MIKE-USER-ID', 'd0d0d0d0-0000-0000-0000-000000000001', 'member');
   ```

## Step 4: Verify Setup

Run the check script to verify everything is set up correctly:

```bash
./scripts/simple-db-check.sh
```

You should see:
- ✓ Schema exists
- ✓ Test data exists
- ✅ Your database is fully set up!

## Step 5: Start the Application

```bash
npm run dev
```

Visit http://localhost:3000 and log in with any of the test accounts!

## Troubleshooting

### "Schema not found" error
- Make sure you ran the complete-setup.sql file in Step 1
- Check for any error messages in the SQL Editor

### "No test data found" error
- The schema exists but the test data wasn't inserted
- This usually means the users weren't created first
- Follow Step 2 to create users, then Step 3 to link them

### Can't log in
- Make sure you created the users with the exact email addresses listed
- Verify the users are confirmed (check in the Auth dashboard)
- Try resetting the password if needed

## Next Steps

Once logged in, you'll see:
- 3 property associations (Sunset Ridge HOA, Oak Park Condos, Riverside Apartments)
- 5 projects with different statuses
- 6 tasks in various states
- 3 vendors in the directory
- Categories for organizing items

The application is now ready for development and testing!
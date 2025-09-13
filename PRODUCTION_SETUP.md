# Project Pro - Production Setup Guide

## Quick Start - Get Out of Demo Mode

Follow these steps to transition from demo mode to a fully functional production system with real database storage.

## Step 1: Database Setup

### Option A: Using Supabase Dashboard (Recommended)

1. **Login to Supabase**: https://app.supabase.com
2. **Navigate to SQL Editor** in your project
3. **Run SQL Scripts in Order**:

#### Script 1: Complete Schema Setup
Run the contents of `supabase/complete-production-setup.sql`

This creates:
- All database tables (projects, tasks, vendors, documents, etc.)
- Custom types and enums
- Indexes for performance
- Row Level Security policies
- Triggers and functions
- Dashboard views

#### Script 2: Create Admin User
First, create a user through Supabase Auth:
1. Go to **Authentication > Users**
2. Click **Add User** 
3. Enter:
   - Email: `admin@projectpro.com` (or your preferred email)
   - Password: Choose a strong password
4. Click **Create User**

Then run this SQL to make them an admin:

```sql
DO $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID := gen_random_uuid();
BEGIN
  -- Get the user ID by email (change to your email)
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'admin@projectpro.com';

  IF v_user_id IS NOT NULL THEN
    -- Create/update profile
    INSERT INTO public.profiles (id, email, full_name, company)
    VALUES (v_user_id, 'admin@projectpro.com', 'Admin User', 'Your Company Name')
    ON CONFLICT (id) DO UPDATE
    SET full_name = 'Admin User', company = 'Your Company Name';

    -- Create tenant
    INSERT INTO public.tenants (id, name, slug)
    VALUES (v_tenant_id, 'Your Company Name', 'your-company')
    ON CONFLICT (id) DO NOTHING;

    -- Make user owner of tenant
    INSERT INTO public.user_tenants (user_id, tenant_id, role, is_default)
    VALUES (v_user_id, v_tenant_id, 'owner', true)
    ON CONFLICT (user_id, tenant_id) DO UPDATE
    SET role = 'owner', is_default = true;

    RAISE NOTICE 'Admin setup complete!';
  ELSE
    RAISE EXCEPTION 'User not found. Please create the user first.';
  END IF;
END $$;
```

#### Script 3: Seed Initial Data (Optional)
Run `supabase/seed-production-data.sql` to add sample data:
- Categories (Construction, Renovation, Electrical, Plumbing, etc.)
- Sample clients
- Sample projects
- Sample tasks
- Sample vendors

### Option B: Using psql Command Line

```bash
# Connect to your database
psql postgres://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres

# Run scripts
\i supabase/complete-production-setup.sql
\i supabase/create-admin-user.sql
\i supabase/seed-production-data.sql
```

## Step 2: Environment Configuration

1. **Backup current demo config**:
```bash
cp .env.local .env.local.demo-backup
```

2. **Switch to production config**:
```bash
cp .env.local.production .env.local
```

3. **Update .env.local** with your actual values:
   - Keep the SUPABASE_URL and ANON_KEY as is (they're already correct)
   - Get SERVICE_ROLE_KEY from Supabase Dashboard > Settings > API
   - Set `NEXT_PUBLIC_DEMO_MODE=false`

## Step 3: Remove Demo Mode from Code

The app will automatically use real database when `NEXT_PUBLIC_DEMO_MODE=false`.

Key files that check for demo mode:
- `src/app/(dashboard)/layout.tsx` - Main dashboard layout
- `src/lib/hooks/use-projects.ts` - Project data hooks
- `src/lib/hooks/use-tasks.ts` - Task data hooks
- `src/app/(auth)/login/page.tsx` - Login page

## Step 4: Start the Application

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Or for production build
npm run build
npm start
```

## Step 5: Login

1. Navigate to http://localhost:3000
2. Login with:
   - Email: `admin@projectpro.com` (or the email you used)
   - Password: Your chosen password

## Features Now Available

With demo mode disabled, you now have:

### ✅ Full Database Persistence
- All data saved to PostgreSQL
- No more localStorage or session storage
- Data persists between sessions

### ✅ Multi-User Support
- Create unlimited users
- User authentication via Supabase Auth
- Role-based access (Owner, Admin, Member)

### ✅ Multi-Tenant Architecture
- Support multiple companies/organizations
- Users can belong to multiple tenants
- Data isolation between tenants

### ✅ Complete Feature Set
- **Projects**: Full CRUD with status tracking
- **Tasks**: Kanban board with drag-and-drop
- **Vendors**: Subcontractor management
- **Documents**: File storage and management
- **Calendar**: Event scheduling
- **Messages**: Team communication
- **Reports**: Analytics and insights
- **Activity Logs**: Audit trail
- **Notifications**: Real-time updates

### ✅ Security Features
- Row Level Security (RLS) enabled
- Secure authentication
- API key protection
- SQL injection prevention

## Troubleshooting

### Can't login?
- Verify user was created in Supabase Auth
- Check email/password are correct
- Ensure .env.local has correct Supabase URL and keys

### Database errors?
- Check all SQL scripts ran successfully
- Verify RLS policies are in place
- Check Supabase logs for detailed errors

### Demo mode still active?
- Verify `NEXT_PUBLIC_DEMO_MODE=false` in .env.local
- Clear browser cache and cookies
- Restart the development server

## Adding More Users

To add additional users:

1. Have them sign up through the app
2. Or create them in Supabase Dashboard
3. Then link them to your tenant:

```sql
-- Link existing user to your tenant
INSERT INTO public.user_tenants (user_id, tenant_id, role)
SELECT 
  (SELECT id FROM auth.users WHERE email = 'newuser@example.com'),
  (SELECT id FROM public.tenants WHERE slug = 'your-company'),
  'member'; -- or 'admin' for admin privileges
```

## Next Steps

1. **Customize company info**: Update tenant name and settings
2. **Add team members**: Invite your team to join
3. **Import existing data**: Migrate from other systems
4. **Configure integrations**: Set up email, calendar sync, etc.
5. **Deploy to production**: Use Vercel, Netlify, or your preferred host

## Support

For issues or questions:
- Check Supabase logs: Dashboard > Logs > API
- Review browser console for client-side errors
- Verify all environment variables are set correctly

---

**You're now running Project Pro in full production mode! 🚀**
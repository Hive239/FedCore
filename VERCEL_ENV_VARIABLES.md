# Vercel Environment Variables for FEDCORE

## Required Environment Variables

Add these environment variables in your Vercel dashboard:
**Settings > Environment Variables**

### 1. Supabase Configuration (REQUIRED)
```
NEXT_PUBLIC_SUPABASE_URL=https://uaruyrkcisljnkwjwygn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhcnV5cmtjaXNsam5rd2p3eWduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0NjQ5NDUsImV4cCI6MjA2ODA0MDk0NX0.ZcfBiJgwHh7vVrxUy3WdAbfvhiuqFqs-NahJjwtUmNQ
```

### 2. Supabase Service Role Key (REQUIRED - KEEP SECRET!)
```
SUPABASE_SERVICE_ROLE_KEY=[Get from Supabase Dashboard > Settings > API > service_role key]
```
⚠️ **IMPORTANT**: This is a secret key. Never expose it in client-side code or commit it to version control.

### 3. Production Mode Settings (REQUIRED)
```
NEXT_PUBLIC_DEMO_MODE=false
NODE_ENV=production
```

### 4. Application URL (REQUIRED)
```
NEXT_PUBLIC_APP_URL=https://[your-project-name].vercel.app
```
Replace `[your-project-name]` with your actual Vercel deployment URL.

### 5. Map and Weather Settings (Optional)
```
NEXT_PUBLIC_OPENWEATHER_API_KEY=[Get from OpenWeatherMap.org]
```
This enables weather overlays on the map view. Sign up at https://openweathermap.org/api to get a free API key.

### 6. Optional Settings
```
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_ERROR_TRACKING=false
```

## How to Add Variables in Vercel:

1. Go to your Vercel Dashboard
2. Select your FEDCORE project
3. Navigate to **Settings** > **Environment Variables**
4. Add each variable one by one:
   - Enter the **Name** (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
   - Enter the **Value** 
   - Select environments: **Production**, **Preview**, and **Development**
   - Click **Save**

## Getting the Service Role Key:

1. Go to your Supabase Dashboard
2. Select your FEDCORE project
3. Navigate to **Settings** > **API**
4. Copy the `service_role` key (under Project API keys)
5. Add it as `SUPABASE_SERVICE_ROLE_KEY` in Vercel

## Verifying Your Setup:

After adding all variables and redeploying:
1. Your app should connect to the production database
2. Authentication should work with admin@projectpro.com
3. All data should persist in Supabase
4. Demo mode should be completely disabled

## Admin Access:
- Email: `admin@projectpro.com`
- Password: Set via Supabase Auth dashboard or reset password flow

## Notes:
- These variables are already configured in your local `.env.local` file
- Vercel automatically rebuilds when you add/change environment variables
- Keep the service role key secure - it has full database access
- The anon key is safe to expose in client-side code
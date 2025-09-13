# Vercel Environment Variables Setup

## Required Environment Variables

Add these environment variables in your Vercel project settings:
1. Go to https://vercel.com/your-team/project-pro/settings/environment-variables
2. Add the following variables for Production, Preview, and Development:

### Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=https://uaruyrkcisljnkwjwygn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhcnV5cmtjaXNsam5rd2p3eWduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0NjQ5NDUsImV4cCI6MjA2ODA0MDk0NX0.ZcfBiJgwHh7vVrxUy3WdAbfvhiuqFqs-NahJjwtUmNQ
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhcnV5cmtjaXNsam5rd2p3eWduIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ2NDk0NSwiZXhwIjoyMDY4MDQwOTQ1fQ.fHIsKiv4BS9sBdsTXXmGoIIPC0GnYo0tvqyxt8itBGg
```

### Application Settings
```
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app
NEXT_PUBLIC_DEMO_MODE=false
```

### Weather API
```
NEXT_PUBLIC_OPENWEATHER_API_KEY=cebea6d73816dccaecbe0dcd99d2471c
```

### Stripe Configuration
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=[your_stripe_publishable_key]
STRIPE_SECRET_KEY=[your_stripe_secret_key]
STRIPE_WEBHOOK_SECRET=[your_stripe_webhook_secret]
```

### Email Configuration (if using Nodemailer)
```
GMAIL_USER=your-noreply-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password-here
```

### Cache Configuration
```
CACHE_TTL_SHORT=60
CACHE_TTL_MEDIUM=300
CACHE_TTL_LONG=3600
CACHE_TTL_EXTENDED=86400
```

### Rate Limiting
```
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Analytics (Optional)
```
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_ERROR_TRACKING=false
```

## Important Notes

1. **NEXT_PUBLIC_APP_URL**: Update this to your actual Vercel deployment URL
2. **STRIPE_WEBHOOK_SECRET**: Get this from Stripe Dashboard after setting up webhooks
3. **Email Configuration**: Set up Gmail app password or use a different email service
4. After adding all variables, redeploy your application

## Quick Setup via Vercel CLI

If you have Vercel CLI installed, you can also add these via command line:
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Then paste the value when prompted
```

Repeat for each environment variable.
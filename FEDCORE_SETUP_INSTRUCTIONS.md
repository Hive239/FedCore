# FedCore Platform Setup Instructions

## Overview
FedCore has been successfully replicated from Project Pro. Follow these steps to set up your new platform with GitHub, Supabase, and Vercel.

## 1. GitHub Setup

### Create a New Repository
1. Go to [GitHub](https://github.com) and sign in
2. Click "New repository" (green button)
3. Name it: `FedCore`
4. Set it as Private or Public based on your preference
5. Do NOT initialize with README (we already have one)
6. Click "Create repository"

### Push FedCore to GitHub
```bash
cd /Users/mpari/Desktop/HIVE239/Project\ Pro/FedCore

# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial FedCore platform setup"

# Add your GitHub repository as origin
git remote add origin https://github.com/YOUR_USERNAME/FedCore.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## 2. Supabase Setup

### Create a New Supabase Project
1. Go to [Supabase](https://app.supabase.com)
2. Click "New project"
3. Name it: `FedCore`
4. Choose a strong database password (save this!)
5. Select your region
6. Click "Create new project"

### Get Your Supabase Keys
Once your project is created:
1. Go to Settings → API
2. Copy these values:
   - `Project URL` → This is your NEXT_PUBLIC_SUPABASE_URL
   - `anon public` key → This is your NEXT_PUBLIC_SUPABASE_ANON_KEY
   - `service_role` key → This is your SUPABASE_SERVICE_ROLE_KEY (keep this secret!)

### Set Up Database Tables
1. In Supabase dashboard, go to SQL Editor
2. Run the database setup scripts from your project (check DATABASE_SETUP.md for schemas)
3. Enable Row Level Security (RLS) on all tables
4. Set up authentication providers if needed (Settings → Authentication)

## 3. Local Development Setup

### Configure Environment Variables
1. Copy the example environment file:
```bash
cp .env.local.example .env.local
```

2. Edit `.env.local` and add your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_project_url_from_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_from_supabase
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_from_supabase
```

### Install Dependencies and Run Locally
```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Visit http://localhost:3000 to see your FedCore platform running locally.

## 4. Vercel Deployment

### Deploy to Vercel
1. Go to [Vercel](https://vercel.com)
2. Sign in with your GitHub account
3. Click "Add New Project"
4. Import your `FedCore` repository from GitHub
5. Configure project:
   - Framework Preset: Next.js (should auto-detect)
   - Root Directory: Leave as is
   - Build Command: `npm run build`
   - Output Directory: Leave as default

### Add Environment Variables in Vercel
1. Before deploying, add your environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   
2. Add any additional variables from your `.env.local` file:
   - Stripe keys (if using payments)
   - Email service keys (if using email)
   - Redis keys (if using caching)
   - Mapbox token (if using maps)

3. Click "Deploy"

### Custom Domain (Optional)
After deployment:
1. Go to your project settings in Vercel
2. Navigate to "Domains"
3. Add your custom domain (e.g., fedcore.com)
4. Follow DNS configuration instructions

## 5. Optional Services Setup

### Stripe (Payment Processing)
1. Create account at [Stripe](https://stripe.com)
2. Get your API keys from the Dashboard
3. Add to environment variables:
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET` (after setting up webhooks)

### Resend (Email Service)
1. Sign up at [Resend](https://resend.com)
2. Get your API key
3. Add to environment: `RESEND_API_KEY`

### Upstash Redis (Caching)
1. Create account at [Upstash](https://upstash.com)
2. Create a new Redis database
3. Add credentials:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### Mapbox (Maps)
1. Sign up at [Mapbox](https://www.mapbox.com)
2. Get your access token
3. Add to environment: `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`

## 6. Post-Deployment Checklist

- [ ] Test user registration and login
- [ ] Verify database connections
- [ ] Check all environment variables are set correctly
- [ ] Test email sending (if configured)
- [ ] Verify payment processing (if using Stripe)
- [ ] Set up monitoring (Vercel Analytics, Sentry, etc.)
- [ ] Configure backup strategies for database
- [ ] Review and update security settings in Supabase
- [ ] Update CORS settings if needed
- [ ] Set up custom email templates in Supabase

## 7. Development Workflow

For ongoing development:
```bash
# Create a new feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "Add your feature"

# Push to GitHub
git push origin feature/your-feature-name

# Create a Pull Request on GitHub
# Vercel will automatically create a preview deployment
```

## Troubleshooting

### Common Issues:

1. **Build fails on Vercel**: Check all environment variables are set
2. **Database connection errors**: Verify Supabase URL and keys
3. **Authentication not working**: Check Supabase Auth settings and callback URLs
4. **Styles not loading**: Clear build cache in Vercel and redeploy

## Support Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

## Next Steps

1. Customize the branding and UI to match FedCore's identity
2. Modify features based on your specific requirements
3. Set up CI/CD pipelines for automated testing
4. Implement monitoring and analytics
5. Plan your data migration strategy if moving from another platform

Good luck with your FedCore platform! 🚀
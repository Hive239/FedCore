# 🔔 Stripe Webhook Setup Guide

## Overview
Webhooks are **HTTP endpoints** that Stripe calls when events happen (payment succeeded, subscription created, etc.). They keep your database in sync with Stripe.

## ✅ What's Been Created

### 1. **Webhook Endpoint** (`/api/webhooks/stripe`)
- Handles all Stripe events
- Updates tenant subscription status
- Records billing history
- Tracks payment success/failure

### 2. **Checkout API** (`/api/stripe/create-checkout`)
- Creates Stripe checkout sessions
- Handles subscription signups

### 3. **Subscription Management** (`/api/stripe/manage-subscription`)
- Cancel subscriptions
- Upgrade/downgrade plans
- Get subscription details

## 🚀 Setup Instructions

### Step 1: Install Stripe Package
```bash
npm install stripe
```

### Step 2: Get Your Stripe Keys
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers → API Keys**
3. Copy your keys:
   - **Publishable key** (starts with `pk_`)
   - **Secret key** (starts with `sk_`)

### Step 3: Create Products in Stripe
1. Go to **Products** in Stripe Dashboard
2. Create three products:

#### Starter Plan
- Name: "ProjectPro Starter"
- Price: $29/month per user
- Price ID: Save this for later

#### Professional Plan
- Name: "ProjectPro Professional"
- Price: $59/month per user
- Price ID: Save this for later

#### Enterprise Plan
- Name: "ProjectPro Enterprise"
- Price: $99/month per user
- Price ID: Save this for later

### Step 4: Configure Webhook Endpoint
1. In Stripe Dashboard, go to **Developers → Webhooks**
2. Click **Add endpoint**
3. Enter your webhook URL:
   - **Local testing**: Use [ngrok](https://ngrok.com) or [localtunnel](https://localtunnel.me)
     ```bash
     ngrok http 3000
     # Your webhook URL: https://[your-id].ngrok.io/api/webhooks/stripe
     ```
   - **Production**: `https://yourdomain.com/api/webhooks/stripe`

4. Select events to listen for:
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
   - ✅ `checkout.session.completed`

5. Copy the **Webhook signing secret** (starts with `whsec_`)

### Step 5: Add Environment Variables
Add to your `.env.local`:
```env
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Price IDs (from Step 3)
STRIPE_STARTER_PRICE_ID=price_xxxxxxxxxxxxx
STRIPE_PROFESSIONAL_PRICE_ID=price_xxxxxxxxxxxxx
STRIPE_ENTERPRISE_PRICE_ID=price_xxxxxxxxxxxxx

# Your app URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 6: Update Database
Run this SQL to add the subscription history table:
```sql
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  stripe_event_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscription_history_tenant ON subscription_history(tenant_id);
CREATE INDEX idx_subscription_history_event ON subscription_history(stripe_event_id);
```

## 🧪 Testing Webhooks

### Local Testing with Stripe CLI
1. Install Stripe CLI:
   ```bash
   brew install stripe/stripe-cli/stripe
   ```

2. Login to Stripe:
   ```bash
   stripe login
   ```

3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

4. In another terminal, trigger test events:
   ```bash
   # Test successful payment
   stripe trigger invoice.payment_succeeded
   
   # Test subscription creation
   stripe trigger customer.subscription.created
   ```

### Test Checkout Flow
1. Visit `/organization/billing`
2. Click "Upgrade" on a plan
3. Use test card: `4242 4242 4242 4242`
4. Any future date for expiry
5. Any 3 digits for CVC
6. Complete checkout

## 📊 Webhook Events Explained

### `customer.subscription.created`
- **When**: New subscription created
- **Action**: Updates tenant tier and status

### `customer.subscription.updated`
- **When**: Plan changed or renewed
- **Action**: Updates tier, status, and limits

### `customer.subscription.deleted`
- **When**: Subscription canceled
- **Action**: Downgrades to free tier

### `invoice.payment_succeeded`
- **When**: Payment successful
- **Action**: Records payment in billing_history

### `invoice.payment_failed`
- **When**: Payment fails
- **Action**: Marks subscription as past_due

## 🔒 Security Notes

1. **Always verify webhook signatures** - The code already does this
2. **Use webhook secrets** - Never accept unsigned webhooks
3. **Idempotency** - Handle duplicate events gracefully
4. **Error handling** - Return 200 OK even on errors to prevent retries

## 🎯 Next Steps

1. **Create Stripe products** and get price IDs
2. **Configure webhook endpoint** in Stripe Dashboard
3. **Add environment variables**
4. **Test locally** with Stripe CLI
5. **Deploy** and update webhook URL to production

## 📝 Webhook Response Flow

```
User clicks "Upgrade" 
    ↓
Create Checkout Session (API)
    ↓
Redirect to Stripe Checkout
    ↓
User completes payment
    ↓
Stripe sends webhook events:
  1. checkout.session.completed
  2. customer.subscription.created
  3. invoice.payment_succeeded
    ↓
Webhook handler updates:
  - Tenant subscription_tier
  - Tenant subscription_status
  - Billing history record
    ↓
User redirected to success page
```

## ⚠️ Common Issues

### Webhook not receiving events
- Check ngrok/tunnel is running
- Verify webhook URL in Stripe
- Check webhook signing secret

### Database not updating
- Verify tenant has stripe_customer_id
- Check RLS policies
- Review Supabase logs

### Payment not processing
- Ensure products exist in Stripe
- Verify price IDs in env vars
- Check Stripe API version

## ✅ Verification

After setup, you should be able to:
1. Click "Upgrade" on billing page
2. Complete Stripe checkout
3. See subscription updated in database
4. View invoice in billing history

---

**Support**: Check Stripe logs at dashboard.stripe.com/logs for debugging
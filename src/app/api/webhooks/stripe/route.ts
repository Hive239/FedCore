import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

// Initialize Stripe (only if env vars are available)
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder'
const stripe = stripeKey !== 'sk_test_placeholder' ? new Stripe(stripeKey, {
  apiVersion: '2025-07-30.basil',
}) : null

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder'

export async function POST(request: Request) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }
  
  try {
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')!

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const supabase = await createClient()

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdate(supabase, subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCanceled(supabase, subscription)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentSucceeded(supabase, invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(supabase, invoice)
        break
      }

      case 'customer.created': {
        const customer = event.data.object as Stripe.Customer
        await handleCustomerCreated(supabase, customer)
        break
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(supabase, session)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

// Handler functions
async function handleSubscriptionUpdate(
  supabase: any,
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string
  const status = subscription.status
  const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000)
  
  // Get price details
  const priceId = subscription.items.data[0]?.price.id
  const tier = mapPriceToTier(priceId)
  
  // Update tenant subscription
  const { error } = await supabase
    .from('tenants')
    .update({
      stripe_subscription_id: subscription.id,
      subscription_status: mapStripeStatus(status),
      subscription_tier: tier,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId)

  if (error) {
    console.error('Error updating subscription:', error)
    throw error
  }

  // Track the subscription change
  await supabase
    .from('subscription_history')
    .insert({
      tenant_id: await getTenantIdByCustomerId(supabase, customerId),
      event_type: 'subscription_updated',
      stripe_event_id: subscription.id,
      details: {
        status,
        tier,
        current_period_end: currentPeriodEnd,
      },
    })
}

async function handleSubscriptionCanceled(
  supabase: any,
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string
  
  // Update tenant to free/canceled status
  const { error } = await supabase
    .from('tenants')
    .update({
      subscription_status: 'canceled',
      subscription_tier: 'starter', // Downgrade to free tier
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId)

  if (error) {
    console.error('Error canceling subscription:', error)
    throw error
  }
}

async function handlePaymentSucceeded(
  supabase: any,
  invoice: Stripe.Invoice
) {
  const customerId = invoice.customer as string
  const tenantId = await getTenantIdByCustomerId(supabase, customerId)
  
  // Record successful payment
  const { error } = await supabase
    .from('billing_history')
    .insert({
      tenant_id: tenantId,
      invoice_number: invoice.number || `INV-${invoice.id}`,
      stripe_invoice_id: invoice.id,
      amount_cents: invoice.amount_paid,
      currency: invoice.currency,
      status: 'paid',
      period_start: new Date(invoice.period_start * 1000),
      period_end: new Date(invoice.period_end * 1000),
      paid_at: new Date().toISOString(),
      line_items: invoice.lines.data.map(line => ({
        description: line.description,
        amount: line.amount,
        quantity: line.quantity,
      })),
    })

  if (error) {
    console.error('Error recording payment:', error)
    throw error
  }

  // Update subscription status to active if it was past_due
  await supabase
    .from('tenants')
    .update({
      subscription_status: 'active',
    })
    .eq('stripe_customer_id', customerId)
    .eq('subscription_status', 'past_due')
}

async function handlePaymentFailed(
  supabase: any,
  invoice: Stripe.Invoice
) {
  const customerId = invoice.customer as string
  const tenantId = await getTenantIdByCustomerId(supabase, customerId)
  
  // Record failed payment
  await supabase
    .from('billing_history')
    .insert({
      tenant_id: tenantId,
      invoice_number: invoice.number || `INV-${invoice.id}`,
      stripe_invoice_id: invoice.id,
      amount_cents: invoice.amount_due,
      currency: invoice.currency,
      status: 'failed',
      period_start: new Date(invoice.period_start * 1000),
      period_end: new Date(invoice.period_end * 1000),
    })

  // Update subscription status
  await supabase
    .from('tenants')
    .update({
      subscription_status: 'past_due',
    })
    .eq('stripe_customer_id', customerId)

  // TODO: Send email notification about failed payment
}

async function handleCustomerCreated(
  supabase: any,
  customer: Stripe.Customer
) {
  // This is typically handled during signup, but we'll update if needed
  const email = customer.email
  
  if (email) {
    // Find tenant by billing email and update Stripe customer ID
    await supabase
      .from('tenants')
      .update({
        stripe_customer_id: customer.id,
      })
      .eq('billing_email', email)
  }
}

async function handleCheckoutCompleted(
  supabase: any,
  session: Stripe.Checkout.Session
) {
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string
  
  // Update tenant with subscription details
  await supabase
    .from('tenants')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: 'active',
    })
    .eq('id', session.metadata?.tenant_id)
}

// Helper functions
function mapPriceToTier(priceId: string): string {
  // Map your Stripe price IDs to tiers
  const priceTierMap: Record<string, string> = {
    [process.env.STRIPE_STARTER_PRICE_ID!]: 'starter',
    [process.env.STRIPE_PROFESSIONAL_PRICE_ID!]: 'professional',
    [process.env.STRIPE_ENTERPRISE_PRICE_ID!]: 'enterprise',
  }
  return priceTierMap[priceId] || 'starter'
}

function mapStripeStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'active': 'active',
    'past_due': 'past_due',
    'canceled': 'canceled',
    'incomplete': 'pending',
    'incomplete_expired': 'canceled',
    'trialing': 'trialing',
    'unpaid': 'past_due',
  }
  return statusMap[status] || 'active'
}

async function getTenantIdByCustomerId(
  supabase: any,
  customerId: string
): Promise<string> {
  const { data, error } = await supabase
    .from('tenants')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (error || !data) {
    throw new Error(`Tenant not found for customer ${customerId}`)
  }

  return data.id
}

// Also create a table to track subscription events
const createSubscriptionHistoryTable = `
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
`
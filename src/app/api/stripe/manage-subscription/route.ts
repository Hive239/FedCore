import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder'
const stripe = stripeKey !== 'sk_test_placeholder' ? new Stripe(stripeKey, {
  apiVersion: '2025-07-30.basil',
}) : null

// Cancel subscription
export async function DELETE(request: Request) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }
  
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tenantId } = await request.json()

    // Get tenant's subscription ID
    const { data: tenant } = await supabase
      .from('tenants')
      .select('stripe_subscription_id')
      .eq('id', tenantId)
      .single()

    if (!tenant?.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 404 })
    }

    // Cancel subscription at period end
    const subscription = await stripe.subscriptions.update(
      tenant.stripe_subscription_id,
      {
        cancel_at_period_end: true,
      }
    )

    // Update tenant status
    await supabase
      .from('tenants')
      .update({
        subscription_status: 'canceled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', tenantId)

    return NextResponse.json({ 
      message: 'Subscription will be canceled at the end of the billing period',
      cancel_at: subscription.cancel_at,
    })
  } catch (error: any) {
    console.error('Cancel subscription error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}

// Update subscription (upgrade/downgrade)
export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tenantId, newPriceId } = await request.json()

    // Get tenant's subscription
    const { data: tenant } = await supabase
      .from('tenants')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('id', tenantId)
      .single()

    if (!tenant?.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 404 })
    }

    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id)

    // Update subscription with new price
    const updatedSubscription = await stripe.subscriptions.update(
      tenant.stripe_subscription_id,
      {
        items: [
          {
            id: subscription.items.data[0].id,
            price: newPriceId,
          },
        ],
        proration_behavior: 'create_prorations',
      }
    )

    return NextResponse.json({ 
      message: 'Subscription updated successfully',
      subscription: updatedSubscription,
    })
  } catch (error: any) {
    console.error('Update subscription error:', error)
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    )
  }
}

// Get subscription details
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 })
    }

    // Get tenant's subscription
    const { data: tenant } = await supabase
      .from('tenants')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('id', tenantId)
      .single()

    if (!tenant?.stripe_subscription_id) {
      return NextResponse.json({ subscription: null })
    }

    // Get subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(
      tenant.stripe_subscription_id,
      {
        expand: ['items.data.price.product', 'latest_invoice'],
      }
    )

    // Get upcoming invoice
    let upcomingInvoice = null
    // TODO: Fix Stripe API call for upcoming invoice
    // try {
    //   upcomingInvoice = await stripe.invoices.upcoming({
    //     customer: tenant.stripe_customer_id,
    //   })
    // } catch (e) {
    //   // No upcoming invoice
    // }

    return NextResponse.json({ 
      subscription,
      upcomingInvoice,
    })
  } catch (error: any) {
    console.error('Get subscription error:', error)
    return NextResponse.json(
      { error: 'Failed to get subscription' },
      { status: 500 }
    )
  }
}
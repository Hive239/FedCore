import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder'
const stripe = stripeKey !== 'sk_test_placeholder' ? new Stripe(stripeKey, {
  apiVersion: '2025-07-30.basil',
}) : null

export async function POST(request: Request) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }
  
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { priceId, tenantId } = await request.json()

    // Get tenant details
    const { data: tenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single()

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Create or get Stripe customer
    let customerId = tenant.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          tenant_id: tenantId,
          user_id: user.id,
        },
      })
      customerId = customer.id

      // Update tenant with Stripe customer ID
      await supabase
        .from('tenants')
        .update({ stripe_customer_id: customerId })
        .eq('id', tenantId)
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/organization/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/organization/billing?canceled=true`,
      metadata: {
        tenant_id: tenantId,
        user_id: user.id,
      },
      subscription_data: {
        metadata: {
          tenant_id: tenantId,
        },
      },
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve price information
export async function GET() {
  try {
    // Fetch prices from Stripe
    const prices = await stripe.prices.list({
      active: true,
      expand: ['data.product'],
    })

    // Format prices for frontend
    const formattedPrices = prices.data.map(price => ({
      id: price.id,
      unit_amount: price.unit_amount,
      currency: price.currency,
      interval: price.recurring?.interval,
      product: {
        name: (price.product as Stripe.Product).name,
        description: (price.product as Stripe.Product).description,
        metadata: (price.product as Stripe.Product).metadata,
      },
    }))

    return NextResponse.json({ prices: formattedPrices })
  } catch (error: any) {
    console.error('Price fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prices' },
      { status: 500 }
    )
  }
}
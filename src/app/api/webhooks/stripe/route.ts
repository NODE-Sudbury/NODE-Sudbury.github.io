import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'
import Stripe from 'stripe'
import { sendStripePaymentConfirmed } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function serviceRole() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: Request) {
  const body = await req.text()
  const sig = headers().get('stripe-signature')

  if (!sig) return new Response('Missing stripe-signature', { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  const supabase = serviceRole()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const { ticket_type_id, event_id, member_id } = session.metadata ?? {}
    if (!ticket_type_id || !event_id || !member_id) {
      return new Response('Missing metadata', { status: 400 })
    }

    // Find existing pending_payment registration
    const { data: existing } = await supabase
      .from('registrations')
      .select('id, status')
      .eq('event_id', event_id)
      .eq('member_id', member_id)
      .single()

    if (existing?.status === 'pending_payment') {
      await supabase.from('registrations').update({ status: 'confirmed' }).eq('id', existing.id)
    } else if (!existing) {
      await supabase.from('registrations').insert({
        event_id, member_id, ticket_type_id, status: 'confirmed',
      })
    }

    // Increment quantity_sold
    const { data: tt } = await supabase.from('ticket_types').select('quantity_sold, name, pricing_model, price_cents').eq('id', ticket_type_id).single()
    if (tt) {
      await supabase.from('ticket_types').update({ quantity_sold: (tt.quantity_sold ?? 0) + 1 }).eq('id', ticket_type_id)
    }

    // Send payment confirmation email (fire-and-forget)
    void (async () => {
      try {
        const { data: memberRow } = await supabase
          .from('members')
          .select('display_name')
          .eq('id', member_id)
          .single()

        const { data: auth } = await supabase.auth.admin.getUserById(member_id)
        const memberEmail = auth?.user?.email
        if (!memberEmail) return

        const { data: ev } = await supabase
          .from('events')
          .select('id, title, slug, starts_at, ends_at, description, event_locations(name)')
          .eq('id', event_id)
          .single()
        if (!ev) return

        const name = memberRow?.display_name || memberEmail.split('@')[0]
        const amountPaid = session.amount_total ? `$${(session.amount_total / 100).toFixed(2)}` : 'Paid'
        const locationName = (ev.event_locations as any)?.name ?? null

        await sendStripePaymentConfirmed(
          memberEmail,
          name,
          { ...ev, location: locationName },
          { name: tt?.name ?? 'Ticket', pricing_model: tt?.pricing_model ?? 'paid', price_cents: tt?.price_cents ?? 0 },
          amountPaid,
        )

        await supabase.from('email_logs').insert({
          member_id,
          email: memberEmail,
          email_type: 'payment_confirmed',
          event_id,
          metadata: { amount: amountPaid },
        })
      } catch (err) {
        console.error('[Email] Stripe payment email failed:', err)
      }
    })()
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session
    const { event_id, member_id } = session.metadata ?? {}
    if (event_id && member_id) {
      await supabase
        .from('registrations')
        .update({ status: 'cancelled' })
        .eq('event_id', event_id)
        .eq('member_id', member_id)
        .eq('status', 'pending_payment')
    }
  }

  return new Response('ok', { status: 200 })
}

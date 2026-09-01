import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json()
  const {
    ticketTypeId,
    tierId,
    dietary_notes,
    tshirt_size,
    accessibility_needs,
    guardian_name,
    guardian_email,
    guardian_phone,
    guardian_relationship,
  } = body ?? {}

  if (!ticketTypeId) return NextResponse.json({ error: 'ticketTypeId required' }, { status: 400 })

  // Fetch ticket type with event
  const { data: ticket } = await supabase
    .from('ticket_types')
    .select('id, name, price_cents, quantity_available, quantity_sold, event_id, events(id, title, slug, starts_at, status)')
    .eq('id', ticketTypeId)
    .single()

  if (!ticket) return NextResponse.json({ error: 'ticket_not_found' }, { status: 404 })

  const event = Array.isArray(ticket.events) ? ticket.events[0] : ticket.events as any
  if (!event || event.status !== 'published') {
    return NextResponse.json({ error: 'event_unavailable' }, { status: 400 })
  }

  // Check sold out
  if (ticket.quantity_available !== null && (ticket.quantity_sold ?? 0) >= ticket.quantity_available) {
    return NextResponse.json({ error: 'event_full' }, { status: 409 })
  }

  // Check existing registration
  const { data: existing } = await supabase
    .from('registrations')
    .select('id, status')
    .eq('event_id', event.id)
    .eq('member_id', session.user.id)
    .single()

  if (existing && existing.status === 'confirmed') {
    return NextResponse.json({ error: 'already_registered' }, { status: 409 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // Build Stripe metadata - values must be strings, max 500 chars each
  const stripeMetadata: Record<string, string> = {
    ticket_type_id: ticketTypeId,
    event_id: event.id,
    member_id: session.user.id,
  }
  if (tierId) stripeMetadata.tier_id = String(tierId)
  if (Array.isArray(dietary_notes) && dietary_notes.length) {
    stripeMetadata.dietary_notes = dietary_notes.join(', ').slice(0, 500)
  }
  if (tshirt_size) stripeMetadata.tshirt_size = String(tshirt_size).slice(0, 50)
  if (accessibility_needs) stripeMetadata.accessibility_needs = String(accessibility_needs).slice(0, 500)
  if (guardian_name) stripeMetadata.guardian_name = String(guardian_name).slice(0, 200)
  if (guardian_email) stripeMetadata.guardian_email = String(guardian_email).slice(0, 200)
  if (guardian_phone) stripeMetadata.guardian_phone = String(guardian_phone).slice(0, 50)
  if (guardian_relationship) stripeMetadata.guardian_relationship = String(guardian_relationship).slice(0, 50)

  // Create Stripe checkout session
  const checkoutSession = await getStripe().checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'cad',
        product_data: {
          name: `${event.title} - ${ticket.name}`,
          description: 'NODE Sudbury event ticket',
        },
        unit_amount: ticket.price_cents,
      },
      quantity: 1,
    }],
    success_url: `${appUrl}/events/${event.slug}?registration=success`,
    cancel_url: `${appUrl}/events/${event.slug}?registration=cancelled`,
    metadata: stripeMetadata,
  })

  // Insert pending registration with logistics metadata
  await supabase.from('registrations').insert({
    event_id: event.id,
    member_id: session.user.id,
    ticket_type_id: ticketTypeId,
    status: 'pending_payment',
    ...(tierId ? { tier_id: tierId } : {}),
    ...(Array.isArray(dietary_notes) && dietary_notes.length ? { dietary_notes } : {}),
    ...(tshirt_size ? { tshirt_size } : {}),
    ...(accessibility_needs ? { accessibility_needs } : {}),
  })

  return NextResponse.json({ url: checkoutSession.url })
}

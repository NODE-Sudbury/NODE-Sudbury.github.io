import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { sendRsvpConfirmation } from '@/lib/email'

export const dynamic = 'force-dynamic'

function serviceRole() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
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
  if (!session) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  let body: { ticketTypeId?: string; tierId?: string; waitlist?: boolean; dietary_notes?: string[]; tshirt_size?: string; accessibility_needs?: string; referral_member_id?: string; show_in_directory?: boolean; open_to_connect?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const { ticketTypeId, tierId, waitlist = false, dietary_notes, tshirt_size, accessibility_needs, referral_member_id, show_in_directory, open_to_connect } = body
  if (!ticketTypeId) {
    return NextResponse.json({ error: 'ticket_type_id_required' }, { status: 400 })
  }

  // Fetch ticket type and verify it belongs to an active event
  const { data: ticket, error: ticketErr } = await supabase
    .from('ticket_types')
    .select('id, event_id, name, pricing_model, price_cents, quantity_available, quantity_sold, is_active, events!inner(id, title, slug, status, deleted_at, starts_at, ends_at, description, event_locations(name))')
    .eq('id', ticketTypeId)
    .eq('is_active', true)
    .single()

  if (ticketErr || !ticket) {
    return NextResponse.json({ error: 'ticket_not_found' }, { status: 404 })
  }

  const event = Array.isArray(ticket.events) ? ticket.events[0] : ticket.events as any
  if (!event || event.deleted_at || !['published', 'unlisted', 'private'].includes(event.status)) {
    return NextResponse.json({ error: 'event_not_available' }, { status: 400 })
  }

  const eventId = ticket.event_id
  const memberId = session.user.id

  // Check for existing registration
  const { data: existing } = await supabase
    .from('registrations')
    .select('id, status')
    .eq('event_id', eventId)
    .eq('member_id', memberId)
    .not('status', 'eq', 'cancelled')
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'already_registered' }, { status: 409 })
  }

  // Check capacity
  const sold = ticket.quantity_sold ?? 0
  const avail = ticket.quantity_available
  const isFull = avail !== null && sold >= avail

  if (isFull && !waitlist) {
    return NextResponse.json({ error: 'event_full' }, { status: 409 })
  }

  let status = 'confirmed'
  let waitlistPosition: number | null = null

  if (isFull && waitlist) {
    status = 'waitlisted'
    const { count } = await supabase
      .from('registrations')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'waitlisted')
    waitlistPosition = (count ?? 0) + 1
  }

  const { data: registration, error: insertErr } = await supabase
    .from('registrations')
    .insert({
      event_id: eventId,
      member_id: memberId,
      ticket_type_id: ticketTypeId,
      status,
      waitlist_position: waitlistPosition,
      ...(tierId ? { tier_id: tierId } : {}),
      ...(dietary_notes?.length ? { dietary_notes } : {}),
      ...(tshirt_size ? { tshirt_size } : {}),
      ...(accessibility_needs ? { accessibility_needs } : {}),
      ...(referral_member_id ? { referral_member_id } : {}),
      ...(show_in_directory !== undefined ? { show_in_directory } : {}),
      ...(open_to_connect !== undefined ? { open_to_connect } : {}),
    })
    .select('id, status, waitlist_position')
    .single()

  if (insertErr || !registration) {
    return NextResponse.json({ error: insertErr?.message ?? 'insert_failed' }, { status: 500 })
  }

  // Send confirmation email (fire-and-forget, never blocks response)
  void (async () => {
    try {
      const memberEmail = session.user.email
      if (!memberEmail) return

      const { data: member } = await supabase
        .from('members')
        .select('display_name')
        .eq('id', memberId)
        .single()

      const name = member?.display_name || memberEmail.split('@')[0]
      const locationName = (event.event_locations as any)?.name ?? null

      await sendRsvpConfirmation(
        memberEmail,
        name,
        { ...event, location: locationName },
        { name: ticket.name, pricing_model: ticket.pricing_model, price_cents: ticket.price_cents },
        status === 'waitlisted',
      )

      // Log the email
      await serviceRole().from('email_logs').insert({
        member_id: memberId,
        email: memberEmail,
        email_type: status === 'waitlisted' ? 'waitlist_confirm' : 'rsvp_confirm',
        event_id: eventId,
      })
    } catch (err) {
      console.error('[Email] RSVP confirmation failed:', err)
    }
  })()

  // Discord webhook - fire and forget, only when registration is confirmed
  if (status === 'confirmed' && process.env.DISCORD_EVENTS_WEBHOOK_URL) {
    const memberEmail = session.user.email ?? ''
    const firstName = memberEmail.split('@')[0]
    const eventTitle: string = event?.title ?? 'NODE Event'
    const tierName: string | null = ticket.name ?? null

    const discordPayload = {
      embeds: [
        {
          title: 'New Registration',
          description: `${firstName} registered for ${eventTitle}`,
          color: 3447003,
          fields: [
            { name: 'Event', value: eventTitle },
            { name: 'Ticket', value: tierName || 'General' },
          ],
          footer: { text: 'NODE Sudbury Events' },
        },
      ],
    }

    void fetch(process.env.DISCORD_EVENTS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discordPayload),
    }).catch((err) => console.error('[Discord] Webhook failed:', err))
  }

  return NextResponse.json({ registration }, { status: 201 })
}

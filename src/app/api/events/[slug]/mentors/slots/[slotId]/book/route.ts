import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function makeClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
}

// POST /api/events/[slug]/mentors/slots/[slotId]/book
// Books an available mentor office hours slot.
// Prevents double-booking by checking booked_by_member_id before updating.
export async function POST(
  _req: NextRequest,
  { params }: { params: { slug: string; slotId: string } }
) {
  const supabase = makeClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Resolve event by slug
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('id')
    .eq('slug', params.slug)
    .is('deleted_at', null)
    .single()

  if (eventErr || !event) {
    return NextResponse.json({ error: 'event_not_found' }, { status: 404 })
  }

  // Fetch the slot and verify it belongs to this event
  const { data: slot, error: slotErr } = await supabase
    .from('mentor_availability_slots')
    .select('*')
    .eq('id', params.slotId)
    .eq('event_id', event.id)
    .single()

  if (slotErr || !slot) {
    return NextResponse.json({ error: 'slot_not_found' }, { status: 404 })
  }

  // Prevent the mentor from booking their own slot
  if (slot.mentor_member_id === session.user.id) {
    return NextResponse.json(
      { error: 'you cannot book your own slot' },
      { status: 400 }
    )
  }

  // Check if already booked
  if (slot.booked_by_member_id) {
    return NextResponse.json(
      { error: 'slot_already_booked' },
      { status: 409 }
    )
  }

  // Prevent the same user from double-booking the same slot (race condition guard
  // via conditional update - only updates if booked_by_member_id is still null)
  const now = new Date().toISOString()
  const { data: updated, error: updateErr } = await supabase
    .from('mentor_availability_slots')
    .update({
      booked_by_member_id: session.user.id,
      booked_at: now,
    })
    .eq('id', params.slotId)
    .eq('event_id', event.id)
    .is('booked_by_member_id', null)
    .select()
    .single()

  if (updateErr || !updated) {
    // Either a DB error or someone else booked between our check and update
    return NextResponse.json(
      { error: 'slot_no_longer_available' },
      { status: 409 }
    )
  }

  return NextResponse.json(
    {
      ok: true,
      booking: {
        slot_id: updated.id,
        starts_at: updated.starts_at,
        ends_at: updated.ends_at,
        mentor_member_id: updated.mentor_member_id,
        booked_by_member_id: updated.booked_by_member_id,
        booked_at: updated.booked_at,
        notes: updated.notes,
      },
    },
    { status: 200 }
  )
}

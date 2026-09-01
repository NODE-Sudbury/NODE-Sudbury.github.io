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

// GET /api/events/[slug]/mentors/slots?mentor_id=xxx
// Returns available office hours slots for a mentor at this event.
// If the mentor_availability_slots table does not exist, returns [] with a note.
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const supabase = makeClient()
  const mentor_id = req.nextUrl.searchParams.get('mentor_id')

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

  let query = supabase
    .from('mentor_availability_slots')
    .select('*')
    .eq('event_id', event.id)
    .order('starts_at')

  if (mentor_id) {
    query = query.eq('mentor_member_id', mentor_id)
  }

  const { data, error } = await query

  if (error) {
    // Table likely does not exist yet - return empty list with a note
    if (
      error.code === '42P01' ||
      error.message?.includes('does not exist') ||
      error.message?.includes('relation')
    ) {
      return NextResponse.json({
        slots: [],
        note: 'mentor_availability_slots table not yet created. Run the migration at supabase/migrations/20260831_mentor_slots.sql.',
      })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ slots: data ?? [] })
}

// POST /api/events/[slug]/mentors/slots
// Body: { starts_at, ends_at, notes? }
// Creates an availability slot. The caller must be a mentor for this event.
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const supabase = makeClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Resolve event
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('id')
    .eq('slug', params.slug)
    .is('deleted_at', null)
    .single()

  if (eventErr || !event) {
    return NextResponse.json({ error: 'event_not_found' }, { status: 404 })
  }

  // Verify the current user is a mentor for this event
  const { data: mentorRow, error: mentorErr } = await supabase
    .from('event_mentors')
    .select('id, member_id')
    .eq('event_id', event.id)
    .eq('member_id', session.user.id)
    .maybeSingle()

  if (mentorErr) {
    return NextResponse.json({ error: mentorErr.message }, { status: 500 })
  }
  if (!mentorRow) {
    return NextResponse.json(
      { error: 'forbidden - you are not a mentor for this event' },
      { status: 403 }
    )
  }

  const body = await req.json()
  const { starts_at, ends_at, notes } = body

  if (!starts_at || !ends_at) {
    return NextResponse.json(
      { error: 'starts_at and ends_at are required' },
      { status: 400 }
    )
  }

  if (new Date(ends_at) <= new Date(starts_at)) {
    return NextResponse.json(
      { error: 'ends_at must be after starts_at' },
      { status: 400 }
    )
  }

  const { data: slot, error: insertErr } = await supabase
    .from('mentor_availability_slots')
    .insert({
      event_id: event.id,
      mentor_member_id: session.user.id,
      starts_at,
      ends_at,
      notes: notes ?? null,
    })
    .select()
    .single()

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ slot }, { status: 201 })
}

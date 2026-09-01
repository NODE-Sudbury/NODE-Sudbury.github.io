import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function serviceRole() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function authClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
}

async function resolveEventId(slug: string): Promise<string | null> {
  const svc = serviceRole()
  const { data } = await svc
    .from('events')
    .select('id')
    .eq('slug', slug)
    .is('is_deleted', null)
    .single()
  return data?.id ?? null
}

async function isConfirmedAttendee(
  supabase: ReturnType<typeof authClient>,
  userId: string,
  eventId: string
): Promise<boolean> {
  const { data: member } = await supabase
    .from('members')
    .select('id')
    .eq('user_id', userId)
    .single()
  if (!member) return false

  const { data: reg } = await supabase
    .from('registrations')
    .select('id')
    .eq('event_id', eventId)
    .eq('member_id', member.id)
    .in('status', ['confirmed', 'checked_in'])
    .maybeSingle()

  return !!reg
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const auth = authClient()
  const { data: { session } } = await auth.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const eventId = await resolveEventId(params.slug)
  if (!eventId) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  const attendee = await isConfirmedAttendee(auth, session.user.id, eventId)
  if (!attendee) {
    return NextResponse.json({ error: 'Forbidden: must be a confirmed attendee' }, { status: 403 })
  }

  const svc = serviceRole()

  const { data: rows, error } = await svc
    .from('carpool_offers')
    .select(`
      id,
      type,
      seats,
      departure_area,
      departure_time,
      pickup_area,
      note,
      members ( full_name )
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const offers: {
    id: string
    member_name: string
    seats: number | null
    departure_area: string | null
    departure_time: string | null
    note: string | null
  }[] = []

  const requests: {
    id: string
    member_name: string
    pickup_area: string | null
    note: string | null
  }[] = []

  for (const row of rows ?? []) {
    const memberName = (row.members as { full_name?: string } | null)?.full_name ?? 'Unknown'

    if (row.type === 'offer') {
      offers.push({
        id: row.id,
        member_name: memberName,
        seats: row.seats ?? null,
        departure_area: row.departure_area ?? null,
        departure_time: row.departure_time ?? null,
        note: row.note ?? null,
      })
    } else {
      requests.push({
        id: row.id,
        member_name: memberName,
        pickup_area: row.pickup_area ?? null,
        note: row.note ?? null,
      })
    }
  }

  return NextResponse.json({ offers, requests })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const auth = authClient()
  const { data: { session } } = await auth.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const eventId = await resolveEventId(params.slug)
  if (!eventId) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  let body: {
    type: 'offer' | 'request'
    seats?: number
    departure_area?: string
    departure_time?: string
    pickup_area?: string
    note?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.type || !['offer', 'request'].includes(body.type)) {
    return NextResponse.json({ error: 'type must be "offer" or "request"' }, { status: 400 })
  }

  const { data: member } = await auth
    .from('members')
    .select('id')
    .eq('user_id', session.user.id)
    .single()

  if (!member) {
    return NextResponse.json({ error: 'Member record not found' }, { status: 404 })
  }

  const svc = serviceRole()

  const insert: Record<string, unknown> = {
    event_id: eventId,
    member_id: member.id,
    type: body.type,
    note: body.note ?? null,
  }

  if (body.type === 'offer') {
    insert.seats = body.seats ?? null
    insert.departure_area = body.departure_area ?? null
    insert.departure_time = body.departure_time ?? null
  } else {
    insert.pickup_area = body.pickup_area ?? null
  }

  const { data: inserted, error: insertError } = await svc
    .from('carpool_offers')
    .insert(insert)
    .select('id')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: inserted.id }, { status: 201 })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const auth = authClient()
  const { data: { session } } = await auth.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { id: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const { data: member } = await auth
    .from('members')
    .select('id')
    .eq('user_id', session.user.id)
    .single()

  if (!member) {
    return NextResponse.json({ error: 'Member record not found' }, { status: 404 })
  }

  const svc = serviceRole()

  const { error: deleteError } = await svc
    .from('carpool_offers')
    .delete()
    .eq('id', body.id)
    .eq('member_id', member.id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

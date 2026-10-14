import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function makeSupabase() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
}

// GET /api/events/[slug]/schedule/rsvp?session_id=X
// Returns: { rsvped: boolean, count: number }
export async function GET(request: Request, { params }: { params: { slug: string } }) {
  const { searchParams } = new URL(request.url)
  const session_id = searchParams.get('session_id')
  if (!session_id) return NextResponse.json({ error: 'session_id required' }, { status: 400 })

  const supabase = makeSupabase()
  const { data: { session } } = await supabase.auth.getSession()

  const { count } = await supabase
    .from('session_rsvps')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', session_id)

  let rsvped = false
  if (session) {
    const { data: existing } = await supabase
      .from('session_rsvps')
      .select('id')
      .eq('session_id', session_id)
      .eq('member_id', session.user.id)
      .maybeSingle()
    rsvped = !!existing
  }

  return NextResponse.json({ rsvped, count: count ?? 0 })
}

// POST /api/events/[slug]/schedule/rsvp
// Body: { session_id: string }
// Returns: { rsvped: boolean, count: number }
export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const supabase = makeSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await request.json()
  const { session_id } = body
  if (!session_id) return NextResponse.json({ error: 'session_id required' }, { status: 400 })

  // Verify the session belongs to this event
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('slug', params.slug)
    .is('deleted_at', null)
    .single()
  if (!event) return NextResponse.json({ error: 'event not found' }, { status: 404 })

  const { data: eventSession } = await supabase
    .from('event_sessions')
    .select('id')
    .eq('id', session_id)
    .eq('event_id', event.id)
    .single()
  if (!eventSession) return NextResponse.json({ error: 'session not found' }, { status: 404 })

  // Check if RSVP exists
  const { data: existing } = await supabase
    .from('session_rsvps')
    .select('id')
    .eq('session_id', session_id)
    .eq('member_id', session.user.id)
    .maybeSingle()

  let rsvped: boolean

  if (existing) {
    // Un-RSVP
    const { error } = await supabase
      .from('session_rsvps')
      .delete()
      .eq('id', existing.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    rsvped = false
  } else {
    // RSVP
    const { error } = await supabase
      .from('session_rsvps')
      .insert({ session_id, member_id: session.user.id })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    rsvped = true
  }

  const { count } = await supabase
    .from('session_rsvps')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', session_id)

  return NextResponse.json({ rsvped, count: count ?? 0 })
}

import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

type Session = { joined_at: string; left_at: string | null }

function calcPeakConcurrent(sessions: Session[]): number {
  if (!sessions.length) return 0

  const events: { time: number; delta: number }[] = []

  for (const s of sessions) {
    const joined = new Date(s.joined_at).getTime()
    const left = s.left_at ? new Date(s.left_at).getTime() : Date.now()
    events.push({ time: joined, delta: 1 })
    events.push({ time: left, delta: -1 })
  }

  events.sort((a, b) => a.time - b.time || a.delta - b.delta)

  let current = 0
  let peak = 0
  for (const e of events) {
    current += e.delta
    if (current > peak) peak = current
  }

  return peak
}

async function getStats(eventId: string) {
  const db = serviceClient()

  const { count: totalRemoteRegistered } = await db
    .from('registrations')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('attendance_mode', 'remote')
    .eq('status', 'confirmed')

  const { data: sessions } = await db
    .from('remote_view_sessions')
    .select('id, event_id, member_id, joined_at, left_at, ip_country')
    .eq('event_id', eventId)

  const activeSessions = (sessions ?? []).filter((s) => s.left_at === null)
  const remoteViewerCount = activeSessions.length
  const peakConcurrent = calcPeakConcurrent(sessions ?? [])

  return {
    remote_viewer_count: remoteViewerCount,
    peak_concurrent: peakConcurrent,
    total_remote_registered: totalRemoteRegistered ?? 0,
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: member } = await supabase
    .from('members')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (member?.role !== 'board' && member?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const stats = await getStats(params.id)
  return NextResponse.json(stats)
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const action: 'join' | 'leave' = body.action
  const memberId: string | undefined = body.member_id

  if (action !== 'join' && action !== 'leave') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const db = serviceClient()

  if (action === 'join') {
    const { error } = await db.from('remote_view_sessions').insert({
      event_id: params.id,
      member_id: memberId ?? null,
      joined_at: new Date().toISOString(),
      left_at: null,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  } else {
    // action === 'leave'
    let query = db
      .from('remote_view_sessions')
      .update({ left_at: new Date().toISOString() })
      .eq('event_id', params.id)
      .is('left_at', null)

    if (memberId) {
      query = query.eq('member_id', memberId)
    } else {
      query = query.is('member_id', null)
    }

    const { error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  const stats = await getStats(params.id)
  return NextResponse.json(stats)
}

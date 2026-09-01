import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'invalid_body' }, { status: 400 }) }

  const { token } = body
  if (!token) return NextResponse.json({ error: 'missing_token' }, { status: 400 })

  const { data: station } = await supabase
    .from('scavenger_stations')
    .select('id, name, points_value, hunt_id, scavenger_hunts(id, is_active, starts_at, ends_at, event_id)')
    .eq('qr_token', token)
    .maybeSingle()

  if (!station) return NextResponse.json({ error: 'station_not_found' }, { status: 404 })

  const hunt = Array.isArray(station.scavenger_hunts) ? station.scavenger_hunts[0] : station.scavenger_hunts
  if (!hunt) return NextResponse.json({ error: 'hunt_not_found' }, { status: 404 })

  const now = new Date()
  const huntActive = hunt.is_active &&
    (!hunt.starts_at || new Date(hunt.starts_at) <= now) &&
    (!hunt.ends_at || new Date(hunt.ends_at) >= now)

  if (!huntActive) return NextResponse.json({ error: 'hunt_inactive' }, { status: 409 })

  const { data: existing } = await supabase
    .from('scavenger_stamps')
    .select('id')
    .eq('station_id', station.id)
    .eq('member_id', session.user.id)
    .maybeSingle()

  if (existing) return NextResponse.json({ error: 'already_stamped' }, { status: 409 })

  const { data: stamp, error: stampErr } = await supabase
    .from('scavenger_stamps')
    .insert({ station_id: station.id, member_id: session.user.id })
    .select('id')
    .single()

  if (stampErr) return NextResponse.json({ error: stampErr.message }, { status: 500 })

  // Award points
  if (station.points_value > 0) {
    await supabase.from('point_events').insert({
      member_id: session.user.id,
      event_id: hunt.event_id ?? null,
      delta: station.points_value,
      reason: `scavenger_stamp:${station.id}`,
    })
  }

  return NextResponse.json({ success: true, stamp_id: stamp.id, station_name: station.name, points_earned: station.points_value }, { status: 201 })
}

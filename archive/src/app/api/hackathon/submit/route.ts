import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { event_id, title, short_description, demo_url, deck_url, prize_tracks, sub_status } = body

  if (!event_id || !title?.trim() || !short_description?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!['draft', 'submitted', 'final'].includes(sub_status)) {
    return NextResponse.json({ error: 'Invalid sub_status' }, { status: 400 })
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: eventCheck } = await db
    .from('events')
    .select('submissions_open, hackathon_submission_deadline')
    .eq('id', event_id)
    .single()
  if (eventCheck?.submissions_open === false) {
    return NextResponse.json({ error: 'Submissions are closed for this event' }, { status: 403 })
  }

  const { data: membership } = await db
    .from('hackathon_team_members')
    .select('team_id, hackathon_teams!inner(id, event_id)')
    .eq('member_id', session.user.id)
    .eq('hackathon_teams.event_id', event_id)
    .maybeSingle()

  if (!membership) {
    return NextResponse.json({ error: 'No team found for this event' }, { status: 403 })
  }

  const teamId = membership.team_id

  const { data: existing } = await db
    .from('hackathon_submissions')
    .select('id, sub_status')
    .eq('team_id', teamId)
    .eq('event_id', event_id)
    .is('round_id', null)
    .maybeSingle()

  if (existing?.sub_status === 'final') {
    return NextResponse.json({ error: 'Submission is finalized and cannot be changed' }, { status: 409 })
  }

  const payload: Record<string, unknown> = {
    team_id: teamId,
    event_id,
    title: title.trim(),
    short_description: short_description.trim(),
    demo_url: demo_url?.trim() || null,
    deck_url: deck_url?.trim() || null,
    prize_tracks: Array.isArray(prize_tracks) ? prize_tracks : [],
    sub_status,
    round_id: null,
  }
  if (sub_status === 'submitted' || sub_status === 'final') {
    payload.submitted_at = new Date().toISOString()
  }

  let submission: any
  if (existing) {
    const { data, error } = await db
      .from('hackathon_submissions')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    submission = data
  } else {
    const { data, error } = await db
      .from('hackathon_submissions')
      .insert(payload)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    submission = data
  }

  return NextResponse.json({ submission }, { status: existing ? 200 : 201 })
}

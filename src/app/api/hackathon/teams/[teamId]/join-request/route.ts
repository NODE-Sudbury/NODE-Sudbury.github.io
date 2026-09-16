import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(_req: Request, { params }: { params: { teamId: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { teamId } = params

  // Load team with members and the event it belongs to
  const { data: team } = await supabase
    .from('hackathon_teams')
    .select('id, event_id, max_size, is_open, hackathon_team_members(id, member_id)')
    .eq('id', teamId)
    .single()

  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  const members = (team.hackathon_team_members as Array<{ id: string; member_id: string }>)

  // Reject if user is already on this team
  if (members.some(m => m.member_id === session.user.id)) {
    return NextResponse.json({ error: 'already_on_team' }, { status: 409 })
  }

  // Reject if team is full
  if (members.length >= (team.max_size ?? 6)) {
    return NextResponse.json({ error: 'Team is full' }, { status: 409 })
  }

  // Check user is not already on a different team for this event
  const { data: existingMembership } = await supabase
    .from('hackathon_team_members')
    .select('id, hackathon_teams!inner(event_id)')
    .eq('member_id', session.user.id)
    .eq('hackathon_teams.event_id', team.event_id)
    .neq('hackathon_teams.id', teamId)
    .maybeSingle()

  if (existingMembership) {
    return NextResponse.json({ error: 'already_on_a_team_for_this_event' }, { status: 409 })
  }

  // Verify the event is a hackathon and is accessible (published or draft)
  const { data: event } = await supabase
    .from('events')
    .select('id, type, status')
    .eq('id', team.event_id)
    .in('status', ['published', 'draft'])
    .eq('type', 'hackathon')
    .maybeSingle()

  if (!event) {
    return NextResponse.json({ error: 'Event not found or not accepting registrations' }, { status: 404 })
  }

  // Add the user directly as a member
  const { error: insertErr } = await supabase.from('hackathon_team_members').insert({
    team_id: teamId,
    member_id: session.user.id,
    role: 'member',
  })

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}

export async function PATCH(req: Request, { params }: { params: { teamId: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { teamId } = params
  const body = await req.json().catch(() => ({}))
  const { looking_for_members, lft_note } = body

  // Verify caller is the team captain
  const { data: membership } = await supabase
    .from('hackathon_team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('member_id', session.user.id)
    .maybeSingle()

  if (!membership || membership.role !== 'captain') {
    return NextResponse.json({ error: 'Only the team captain can update LFM settings' }, { status: 403 })
  }

  const patch: Record<string, unknown> = {}
  if (typeof looking_for_members === 'boolean') patch.looking_for_members = looking_for_members
  if (typeof lft_note === 'string') patch.lft_note = lft_note.trim() || null

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { error: updateErr } = await supabase
    .from('hackathon_teams')
    .update(patch)
    .eq('id', teamId)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

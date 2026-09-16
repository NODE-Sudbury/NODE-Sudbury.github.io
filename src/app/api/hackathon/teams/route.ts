import { createServerClient } from '@supabase/auth-helpers-nextjs'
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

  const { event_id, name, description, max_size, is_open } = await req.json()
  if (!event_id || !name?.trim()) {
    return NextResponse.json({ error: 'event_id and name are required' }, { status: 400 })
  }

  // Check not already on a team for this event
  const { data: existing } = await supabase
    .from('hackathon_team_members')
    .select('id, hackathon_teams!inner(event_id)')
    .eq('member_id', session.user.id)
    .eq('hackathon_teams.event_id', event_id)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'already_on_team' }, { status: 409 })
  }

  const { data: team, error: teamErr } = await supabase
    .from('hackathon_teams')
    .insert({
      event_id,
      name: name.trim(),
      description: description?.trim() ?? null,
      max_size: max_size ?? 6,
      is_open: is_open ?? true,
      created_by: session.user.id,
    })
    .select('id, name, description, max_size, is_open, created_by')
    .single()

  if (teamErr || !team) {
    return NextResponse.json({ error: teamErr?.message ?? 'Failed to create team' }, { status: 500 })
  }

  await supabase.from('hackathon_team_members').insert({
    team_id: team.id,
    member_id: session.user.id,
    role: 'captain',
  })

  return NextResponse.json({ team: { ...team, hackathon_team_members: [] } }, { status: 201 })
}

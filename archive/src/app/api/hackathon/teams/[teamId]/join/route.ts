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

  const { data: team } = await supabase
    .from('hackathon_teams')
    .select('id, event_id, max_size, is_open, hackathon_team_members(id, member_id)')
    .eq('id', params.teamId)
    .single()

  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  if (!team.is_open) return NextResponse.json({ error: 'Team is not open' }, { status: 409 })

  const memberCount = (team.hackathon_team_members as any[]).length
  if (memberCount >= team.max_size) return NextResponse.json({ error: 'Team is full' }, { status: 409 })

  const alreadyMember = (team.hackathon_team_members as any[]).some((m: any) => m.member_id === session.user.id)
  if (alreadyMember) return NextResponse.json({ error: 'already_on_team' }, { status: 409 })

  const { error } = await supabase.from('hackathon_team_members').insert({
    team_id: params.teamId,
    member_id: session.user.id,
    role: 'member',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true }, { status: 201 })
}

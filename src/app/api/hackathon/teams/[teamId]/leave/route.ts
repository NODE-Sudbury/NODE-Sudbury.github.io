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

  const { data: members } = await supabase
    .from('hackathon_team_members')
    .select('id, member_id, role')
    .eq('team_id', params.teamId)
    .order('joined_at', { ascending: true })

  if (!members) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  const me = members.find(m => m.member_id === session.user.id)
  if (!me) return NextResponse.json({ error: 'Not a member of this team' }, { status: 403 })

  if (members.length === 1) {
    // Last member - disband team
    await supabase.from('hackathon_team_members').delete().eq('team_id', params.teamId)
    await supabase.from('hackathon_teams').delete().eq('id', params.teamId)
    return NextResponse.json({ disbanded: true }, { status: 200 })
  }

  // Remove member
  await supabase.from('hackathon_team_members').delete().eq('id', me.id)

  // If they were captain, promote oldest remaining member
  if (me.role === 'captain') {
    const next = members.find(m => m.member_id !== session.user.id)
    if (next) {
      await supabase.from('hackathon_team_members').update({ role: 'captain' }).eq('id', next.id)
    }
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}

import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function getBoard(supabase: ReturnType<typeof createServerClient>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('members').select('is_board').eq('user_id', user.id).single()
  return data?.is_board === true
}

export async function POST(req: Request, { params }: { params: { eventId: string; roundId: string } }) {
  const cookieStore = cookies()
    const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )
  if (!await getBoard(supabase)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  let teamIds: string[] = []

  if (body.source === 'leaderboard') {
    const { data: leaders } = await supabase
      .from('hackathon_leaderboard')
      .select('team_id')
      .eq('event_id', params.eventId)
      .order('total_score', { ascending: false })
      .limit(body.limit ?? 8)
    teamIds = (leaders ?? []).map((r: { team_id: string }) => r.team_id).filter(Boolean)
  } else {
    teamIds = body.team_ids ?? []
  }

  if (teamIds.length === 0) return NextResponse.json({ error: 'No teams to seed' }, { status: 400 })

  const rows = teamIds.map((id, i) => ({
    round_id: params.roundId,
    team_id: id,
    seed: i + 1,
    score: 0,
    advanced: false,
  }))

  const { error } = await supabase
    .from('hackathon_round_teams')
    .upsert(rows, { onConflict: 'round_id,team_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ seeded: rows.length })
}

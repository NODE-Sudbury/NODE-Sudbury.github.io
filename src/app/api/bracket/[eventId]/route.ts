import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { eventId: string } }) {
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

  const { data: rounds } = await supabase
    .from('hackathon_rounds')
    .select(`
      id, name, round_order, status, max_advancing, starts_at, ends_at,
      hackathon_round_teams (
        score, seed, advanced,
        team_id,
        hackathon_teams ( id, name )
      ),
      bracket_matchups (
        id, team_a_id, team_b_id, winner_team_id, judge_notes, decided_at
      )
    `)
    .eq('event_id', params.eventId)
    .order('round_order')

  return NextResponse.json(rounds ?? [])
}

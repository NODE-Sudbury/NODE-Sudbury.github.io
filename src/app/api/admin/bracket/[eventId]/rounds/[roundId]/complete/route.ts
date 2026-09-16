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

export async function POST(_req: Request, { params }: { params: { eventId: string; roundId: string } }) {
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

  const { data: round } = await supabase
    .from('hackathon_rounds')
    .select('max_advancing, round_order, event_id')
    .eq('id', params.roundId)
    .single()
  if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 })

  const { data: entries } = await supabase
    .from('hackathon_round_teams')
    .select('team_id, score')
    .eq('round_id', params.roundId)
    .order('score', { ascending: false })

  const advancing = round.max_advancing ? (entries ?? []).slice(0, round.max_advancing) : (entries ?? [])
  const advancingIds = advancing.map((e: { team_id: string }) => e.team_id)

  // Mark advancing
  await supabase.from('hackathon_round_teams').update({ advanced: true }).eq('round_id', params.roundId).in('team_id', advancingIds)

  // Mark round completed
  await supabase.from('hackathon_rounds').update({ status: 'completed' }).eq('id', params.roundId)

  // Seed advancing teams into next round if it exists
  const { data: nextRound } = await supabase
    .from('hackathon_rounds')
    .select('id')
    .eq('event_id', round.event_id)
    .eq('round_order', round.round_order + 1)
    .single()

  if (nextRound && advancingIds.length > 0) {
    const nextEntries = advancingIds.map((id: string, i: number) => ({
      round_id: nextRound.id,
      team_id: id,
      seed: i + 1,
      score: 0,
      advanced: false,
    }))
    await supabase.from('hackathon_round_teams').upsert(nextEntries, { onConflict: 'round_id,team_id' })
    await supabase.from('hackathon_rounds').update({ status: 'active' }).eq('id', nextRound.id)
  }

  return NextResponse.json({ advanced: advancingIds.length, nextRound: nextRound?.id ?? null })
}

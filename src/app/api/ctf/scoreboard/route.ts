import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const event_id = searchParams.get('event_id')
  if (!event_id) {
    return NextResponse.json({ error: 'event_id required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Pull all correct submissions for challenges in this event
  const { data: submissions, error } = await supabase
    .from('ctf_submissions')
    .select('member_id, created_at, ctf_challenges!inner(points, category, event_id)')
    .eq('ctf_challenges.event_id', event_id)
    .eq('is_correct', true)
    .order('created_at', { ascending: true })

  if (error || !submissions) {
    // Fallback to ctf_leaderboard view if direct join fails
    const { data: leaderboard } = await supabase
      .from('ctf_leaderboard')
      .select('*')
      .eq('event_id', event_id)
      .order('total_points', { ascending: false })
      .limit(100)

    const scores = (leaderboard ?? []).map((row: any, i: number) => ({
      rank: i + 1,
      name: row.member_name ?? row.team_name ?? 'Unknown',
      score: row.total_points ?? row.score ?? 0,
      solves: null,
      last_solve_at: null,
      categories: null,
    }))

    return NextResponse.json(
      { scores, updated_at: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, max-age=10, stale-while-revalidate=20' } }
    )
  }

  // Aggregate by member_id
  type MemberData = {
    score: number
    solves: number
    last_solve_at: string
    categories: Record<string, number>
  }
  const memberMap = new Map<string, MemberData>()

  for (const sub of submissions) {
    const ch = (sub as any).ctf_challenges
    const memberId = sub.member_id
    const existing = memberMap.get(memberId)
    if (existing) {
      existing.score += ch.points ?? 0
      existing.solves += 1
      if (sub.created_at > existing.last_solve_at) {
        existing.last_solve_at = sub.created_at
      }
      existing.categories[ch.category] = (existing.categories[ch.category] ?? 0) + (ch.points ?? 0)
    } else {
      memberMap.set(memberId, {
        score: ch.points ?? 0,
        solves: 1,
        last_solve_at: sub.created_at,
        categories: { [ch.category]: ch.points ?? 0 },
      })
    }
  }

  // Resolve member names from profiles table
  const memberIds = [...memberMap.keys()]
  const nameMap = new Map<string, string>()

  if (memberIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username')
      .in('id', memberIds)

    for (const p of profiles ?? []) {
      nameMap.set((p as any).id, (p as any).full_name ?? (p as any).username ?? 'Player')
    }
  }

  // Sort: highest score first; tiebreak by earliest last solve time (solved it faster)
  const scores = [...memberMap.entries()]
    .sort(([, a], [, b]) => {
      if (b.score !== a.score) return b.score - a.score
      return a.last_solve_at < b.last_solve_at ? -1 : 1
    })
    .map(([memberId, data], i) => ({
      rank: i + 1,
      name: nameMap.get(memberId) ?? 'Player',
      score: data.score,
      solves: data.solves,
      last_solve_at: data.last_solve_at,
      categories: data.categories,
    }))

  return NextResponse.json(
    { scores, updated_at: new Date().toISOString() },
    { headers: { 'Cache-Control': 'public, max-age=10, stale-while-revalidate=20' } }
  )
}

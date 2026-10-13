import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function serviceRole() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') // 'month' | null

  const supabase = serviceRole()

  let pointsQuery = supabase
    .from('member_points')
    .select('member_id, points, created_at')

  if (period === 'month') {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    pointsQuery = pointsQuery.gte('created_at', monthStart)
  }

  const { data: pointsRows, error: pointsErr } = await pointsQuery
  if (pointsErr) {
    return NextResponse.json({ error: pointsErr.message }, { status: 500 })
  }

  // Aggregate points per member
  const totalsMap: Record<string, number> = {}
  for (const row of pointsRows ?? []) {
    totalsMap[row.member_id] = (totalsMap[row.member_id] ?? 0) + (row.points ?? 0)
  }

  const memberIds = Object.keys(totalsMap)
  if (memberIds.length === 0) {
    return NextResponse.json({ leaderboard: [] })
  }

  // Fetch member profiles
  const { data: members, error: memberErr } = await supabase
    .from('members')
    .select('id, full_name, avatar_url')
    .in('id', memberIds)

  if (memberErr) {
    return NextResponse.json({ error: memberErr.message }, { status: 500 })
  }

  // Fetch badge counts
  const { data: badgeRows, error: badgeErr } = await supabase
    .from('member_badges')
    .select('member_id')
    .in('member_id', memberIds)

  if (badgeErr) {
    return NextResponse.json({ error: badgeErr.message }, { status: 500 })
  }

  const badgeCountMap: Record<string, number> = {}
  for (const row of badgeRows ?? []) {
    badgeCountMap[row.member_id] = (badgeCountMap[row.member_id] ?? 0) + 1
  }

  const memberMap: Record<string, { full_name: string; avatar_url: string | null }> = {}
  for (const m of members ?? []) {
    memberMap[m.id] = { full_name: m.full_name, avatar_url: m.avatar_url }
  }

  const leaderboard = Object.entries(totalsMap)
    .map(([member_id, total_points]) => ({
      member_id,
      full_name: memberMap[member_id]?.full_name ?? 'Unknown',
      avatar_url: memberMap[member_id]?.avatar_url ?? null,
      total_points,
      badge_count: badgeCountMap[member_id] ?? 0,
    }))
    .sort((a, b) => b.total_points - a.total_points)
    .slice(0, 50)

  return NextResponse.json({ leaderboard })
}

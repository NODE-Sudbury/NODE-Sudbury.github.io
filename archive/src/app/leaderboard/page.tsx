import { createServiceClient } from '@/lib/supabase'
import { BADGE_DEFINITIONS } from '@/lib/badges'
import LeaderboardClient from './LeaderboardClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Community Leaderboard - NODE Sudbury' }

export default async function LeaderboardPage() {
  const supabase = createServiceClient()

  // Fetch all-time leaderboard data server-side
  const { data: pointsRows } = await supabase
    .from('member_points')
    .select('member_id, points, created_at')

  // Aggregate
  const totalsMap: Record<string, number> = {}
  for (const row of pointsRows ?? []) {
    totalsMap[row.member_id] = (totalsMap[row.member_id] ?? 0) + (row.points ?? 0)
  }

  const memberIds = Object.keys(totalsMap)

  let members: { id: string; full_name: string; avatar_url: string | null }[] = []
  let allBadges: { member_id: string; badge_slug: string; badge_name: string; awarded_at: string }[] = []

  if (memberIds.length > 0) {
    const [{ data: m }, { data: b }] = await Promise.all([
      supabase.from('members').select('id, full_name, avatar_url').in('id', memberIds),
      supabase.from('member_badges').select('member_id, badge_slug, badge_name, awarded_at').in('member_id', memberIds),
    ])
    members = m ?? []
    allBadges = b ?? []
  }

  const memberMap: Record<string, { full_name: string; avatar_url: string | null }> = {}
  for (const m of members) {
    memberMap[m.id] = { full_name: m.full_name, avatar_url: m.avatar_url }
  }

  const badgesPerMember: Record<string, { badge_slug: string; badge_name: string }[]> = {}
  for (const b of allBadges) {
    if (!badgesPerMember[b.member_id]) badgesPerMember[b.member_id] = []
    badgesPerMember[b.member_id].push({ badge_slug: b.badge_slug, badge_name: b.badge_name })
  }

  const leaderboard = Object.entries(totalsMap)
    .map(([member_id, total_points]) => ({
      member_id,
      full_name: memberMap[member_id]?.full_name ?? 'Unknown',
      avatar_url: memberMap[member_id]?.avatar_url ?? null,
      total_points,
      badge_count: badgesPerMember[member_id]?.length ?? 0,
      badges: badgesPerMember[member_id] ?? [],
    }))
    .sort((a, b) => b.total_points - a.total_points)
    .slice(0, 50)

  return (
    <LeaderboardClient
      initialLeaderboard={leaderboard}
      badgeDefinitions={BADGE_DEFINITIONS}
    />
  )
}

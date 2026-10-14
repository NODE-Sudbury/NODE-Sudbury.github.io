import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase'
import { BADGE_DEFINITIONS } from '@/lib/badges'
import AdminGamificationClient from './AdminGamificationClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Gamification - Admin' }

export default async function AdminGamificationPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: me } = await supabase
    .from('members')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!me || me.role !== 'board') redirect('/')

  const svc = createServiceClient()

  // Members list for dropdown
  const { data: members } = await svc
    .from('members')
    .select('id, full_name, avatar_url')
    .order('full_name', { ascending: true })

  // Leaderboard data
  const { data: pointsRows } = await svc
    .from('member_points')
    .select('member_id, points, created_at')

  const totalsMap: Record<string, number> = {}
  for (const row of pointsRows ?? []) {
    totalsMap[row.member_id] = (totalsMap[row.member_id] ?? 0) + (row.points ?? 0)
  }

  const memberIds = Object.keys(totalsMap)
  let badgeRows: { member_id: string; badge_slug: string; badge_name: string }[] = []
  if (memberIds.length > 0) {
    const { data: b } = await svc
      .from('member_badges')
      .select('member_id, badge_slug, badge_name')
      .in('member_id', memberIds)
    badgeRows = b ?? []
  }

  const badgesPerMember: Record<string, { badge_slug: string; badge_name: string }[]> = {}
  for (const b of badgeRows) {
    if (!badgesPerMember[b.member_id]) badgesPerMember[b.member_id] = []
    badgesPerMember[b.member_id].push({ badge_slug: b.badge_slug, badge_name: b.badge_name })
  }

  const memberMap: Record<string, string> = {}
  for (const m of members ?? []) {
    memberMap[m.id] = m.full_name
  }

  const leaderboard = Object.entries(totalsMap)
    .map(([member_id, total_points]) => ({
      member_id,
      full_name: memberMap[member_id] ?? 'Unknown',
      total_points,
      badge_count: badgesPerMember[member_id]?.length ?? 0,
      badges: badgesPerMember[member_id] ?? [],
    }))
    .sort((a, b) => b.total_points - a.total_points)
    .slice(0, 50)

  // Recent awards (last 20)
  const { data: recentAwards } = await svc
    .from('member_points')
    .select('id, member_id, points, reason, source_type, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <AdminGamificationClient
      members={members ?? []}
      leaderboard={leaderboard}
      recentAwards={(recentAwards ?? []).map((a) => ({
        ...a,
        member_name: memberMap[a.member_id] ?? 'Unknown',
      }))}
      badgeDefinitions={BADGE_DEFINITIONS}
    />
  )
}

import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import BadgesClient from './BadgesClient'

export const dynamic = 'force-dynamic'

export default async function BadgesPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: member } = await supabase
    .from('members')
    .select('id, full_name')
    .eq('id', session.user.id)
    .single()

  if (!member) redirect('/login')

  const [{ data: earnedBadges }, { data: allBadges }, { data: pointRows }] = await Promise.all([
    supabase
      .from('member_badges')
      .select('badge_id, earned_at')
      .eq('member_id', member.id),
    supabase
      .from('badge_definitions')
      .select('id, name, description, trigger, points, icon_url')
      .eq('is_active', true)
      .order('points', { ascending: false }),
    supabase
      .from('point_events')
      .select('points, reason, created_at')
      .eq('member_id', member.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const totalPoints = (pointRows ?? []).reduce((sum, r) => sum + (r.points ?? 0), 0)
  const earnedSet = new Set((earnedBadges ?? []).map((b) => b.badge_id))
  const earnedMap = Object.fromEntries((earnedBadges ?? []).map((b) => [b.badge_id, b.earned_at]))

  return (
    <BadgesClient
      allBadges={allBadges ?? []}
      earnedSet={[...earnedSet]}
      earnedMap={earnedMap}
      pointHistory={pointRows ?? []}
      totalPoints={totalPoints}
      memberName={member.full_name ?? 'Member'}
    />
  )
}

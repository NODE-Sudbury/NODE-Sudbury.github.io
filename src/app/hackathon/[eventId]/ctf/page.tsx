import { supabase } from '@/lib/supabase'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import CTFClient from './CTFClient'

export const dynamic = 'force-dynamic'

export default async function CTFPage({ params }: { params: { eventId: string } }) {
  const { eventId } = params
  const cookieStore = cookies()

  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { session } } = await authClient.auth.getSession()
  if (!session) redirect(`/login?next=/hackathon/${eventId}/ctf`)

  const { data: event } = await supabase
    .from('events')
    .select('id, title, slug, type, status')
    .eq('id', eventId)
    .eq('type', 'hackathon')
    .single()
  if (!event) notFound()

  const { data: challenges } = await supabase
    .from('ctf_challenges')
    .select('id, title, description, category, points, difficulty, is_active, flag_format_hint, hint_cost_points, hints')
    .eq('event_id', eventId)
    .eq('is_active', true)
    .order('points', { ascending: true })

  const { data: solves } = await authClient
    .from('ctf_submissions')
    .select('challenge_id, created_at')
    .eq('member_id', session.user.id)
    .eq('is_correct', true)

  const { data: hintPurchases } = await authClient
    .from('ctf_hint_purchases')
    .select('challenge_id, hint_index, purchased_at')
    .eq('member_id', session.user.id)

  const { data: leaderboard } = await supabase
    .from('ctf_leaderboard')
    .select('*')
    .eq('event_id', eventId)
    .limit(20)

  return (
    <CTFClient
      event={event}
      challenges={(challenges ?? []) as any}
      solvedIds={(solves ?? []).map((s: any) => s.challenge_id)}
      hintPurchases={(hintPurchases ?? []) as any}
      leaderboard={(leaderboard ?? []) as any}
      memberId={session.user.id}
    />
  )
}

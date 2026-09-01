import { supabase } from '@/lib/supabase'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import AwardsClient from './AwardsClient'

export const dynamic = 'force-dynamic'

export default async function AwardsPage({ params }: { params: { eventId: string } }) {
  const { eventId } = params
  const cookieStore = cookies()

  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { session } } = await authClient.auth.getSession()

  const { data: event } = await supabase
    .from('events')
    .select('id, title, slug, type, hackathon_judging_ends_at')
    .eq('id', eventId)
    .eq('type', 'hackathon')
    .single()
  if (!event) notFound()

  const judgingClosed = event.hackathon_judging_ends_at
    ? new Date(event.hackathon_judging_ends_at) < new Date()
    : false

  const { data: awards } = await supabase
    .from('awards')
    .select('id, name, description, award_type, icon_emoji')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  const { data: recipients } = await supabase
    .from('award_recipients')
    .select('id, award_id, notes, awarded_at, team:hackathon_teams(id, name), member:members(id, full_name)')
    .in('award_id', (awards ?? []).map(a => a.id))

  const { data: voteCounts } = await supabase
    .from('community_votes')
    .select('award_id, team_id')
    .in('award_id', (awards ?? []).map(a => a.id))

  const { data: submissions } = await supabase
    .from('hackathon_submissions')
    .select('id, title, team_id, demo_url, hackathon_teams(name)')
    .eq('event_id', eventId)
    .in('sub_status', ['submitted', 'final'])

  const { data: myVotes } = session
    ? await authClient.from('community_votes').select('award_id, team_id').eq('member_id', session.user.id)
    : { data: [] }

  return (
    <AwardsClient
      event={event}
      judgingClosed={judgingClosed}
      awards={(awards ?? []) as any}
      recipients={(recipients ?? []) as any}
      voteCounts={(voteCounts ?? []) as any}
      submissions={(submissions ?? []) as any}
      myVotes={(myVotes ?? []) as any}
      memberId={session?.user.id ?? null}
    />
  )
}

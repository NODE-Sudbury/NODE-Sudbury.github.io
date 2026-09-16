import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import SubmitClient from './SubmitClient'

export const dynamic = 'force-dynamic'

const PRIZE_TRACKS_DEFAULT = [
  'Best Overall',
  'Best Design',
  'Most Innovative',
  'Best Technical',
  'Community Impact',
]

export default async function SubmitPage({ params }: { params: { eventId: string } }) {
  const { eventId } = params

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect(`/login?next=/hackathon/${eventId}/submit`)

  const { data: event } = await supabase
    .from('events')
    .select('id, title, slug, type, status, hackathon_submission_deadline')
    .eq('id', eventId)
    .eq('type', 'hackathon')
    .single()

  if (!event || !['published', 'draft'].includes(event.status)) notFound()

  const { data: membership } = await supabase
    .from('hackathon_team_members')
    .select('team_id, role, hackathon_teams(id, name)')
    .eq('member_id', session.user.id)
    .eq('hackathon_teams.event_id', eventId)
    .not('hackathon_teams', 'is', null)
    .maybeSingle()

  const team = (membership as any)?.hackathon_teams ?? null

  let submission = null
  if (team) {
    const { data } = await supabase
      .from('hackathon_submissions')
      .select('*')
      .eq('team_id', team.id)
      .eq('event_id', eventId)
      .is('round_id', null)
      .maybeSingle()
    submission = data
  }

  // Fetch distinct prize tracks already used by other submissions for this event
  // and merge with defaults so teams can see all available options
  const { data: existingSubmissions } = await supabase
    .from('hackathon_submissions')
    .select('prize_tracks')
    .eq('event_id', eventId)
    .not('prize_tracks', 'is', null)

  const usedTracks: string[] = []
  for (const sub of existingSubmissions ?? []) {
    if (Array.isArray(sub.prize_tracks)) {
      for (const t of sub.prize_tracks as string[]) {
        if (t && !usedTracks.includes(t)) usedTracks.push(t)
      }
    }
  }

  // Merge defaults with any tracks found in existing submissions (deduplicated)
  const prizeTrackOptions = [...PRIZE_TRACKS_DEFAULT]
  for (const t of usedTracks) {
    if (!prizeTrackOptions.includes(t)) prizeTrackOptions.push(t)
  }

  return (
    <SubmitClient
      event={event}
      team={team}
      submission={submission}
      memberId={session.user.id}
      prizeTrackOptions={prizeTrackOptions}
    />
  )
}

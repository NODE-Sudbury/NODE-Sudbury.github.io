import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import HackathonClient from './HackathonClient'

export const dynamic = 'force-dynamic'

export default async function HackathonPage({ params }: { params: { eventId: string } }) {
  const { eventId } = params

  const { data: event } = await supabase
    .from('events')
    .select('id, title, slug, starts_at, ends_at, status, type, hackathon_kickoff_at, hackathon_hacking_starts_at, hackathon_teams_lock_at, hackathon_submission_deadline, hackathon_judging_starts_at, hackathon_results_announced_at')
    .eq('id', eventId)
    .eq('type', 'hackathon')
    .single()

  if (!event || !['published', 'draft'].includes(event.status)) notFound()

  const { data: allTeams } = await supabase
    .from('hackathon_teams')
    .select('id, name, description, max_size, is_open, created_by, hackathon_team_members(id, member_id, role, members(full_name, avatar_url))')
    .eq('event_id', eventId)
    .is('solo_member_id', null)
    .order('created_at', { ascending: true })

  return (
    <HackathonClient
      event={event}
      allTeams={(allTeams ?? []) as any}
    />
  )
}

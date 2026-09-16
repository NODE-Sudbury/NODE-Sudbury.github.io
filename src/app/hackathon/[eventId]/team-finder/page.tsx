import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import TeamFinderClient from './TeamFinderClient'

export const dynamic = 'force-dynamic'

export default async function TeamFinderPage({ params }: { params: { eventId: string } }) {
  const { eventId } = params

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect(`/login?next=/hackathon/${eventId}/team-finder`)

  const { data: event } = await supabase
    .from('events')
    .select('id, title, type, status')
    .eq('id', eventId)
    .eq('type', 'hackathon')
    .single()

  if (!event || !['published', 'draft'].includes(event.status)) notFound()

  // Fetch all teams with member counts. We treat teams with open spots as LFT.
  // If looking_for_members column exists on hackathon_teams the query will include it;
  // otherwise we fall back to member-count < max_size as the proxy.
  const { data: teamsRaw } = await supabase
    .from('hackathon_teams')
    .select('id, name, description, max_size, is_open, looking_for_members, lft_note, hackathon_team_members(id, member_id)')
    .eq('event_id', eventId)
    .is('solo_member_id', null)
    .order('created_at', { ascending: true })

  const teams = (teamsRaw ?? []).map((t: any) => ({
    id: t.id as string,
    name: t.name as string,
    description: (t.description ?? null) as string | null,
    max_size: (t.max_size ?? 6) as number,
    is_open: (t.is_open ?? true) as boolean,
    // If the column exists use it; otherwise treat any team with open spots as LFT
    looking_for_members: t.looking_for_members != null
      ? Boolean(t.looking_for_members)
      : ((t.hackathon_team_members?.length ?? 0) < (t.max_size ?? 6)),
    lft_note: (t.lft_note ?? null) as string | null,
    member_count: (t.hackathon_team_members?.length ?? 0) as number,
  }))

  // Find current user's team
  const myTeam = teams.find(t =>
    (teamsRaw ?? []).find((raw: any) => raw.id === t.id)
      ?.hackathon_team_members?.some((m: any) => m.member_id === session.user.id)
  ) ?? null

  const myTeamBasic = myTeam ? { id: myTeam.id, name: myTeam.name } : null

  return (
    <TeamFinderClient
      event={{ id: event.id, title: event.title }}
      teams={teams}
      myTeam={myTeamBasic}
    />
  )
}

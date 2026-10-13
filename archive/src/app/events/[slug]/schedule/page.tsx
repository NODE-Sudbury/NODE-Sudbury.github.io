import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import ScheduleClient from './ScheduleClient'

export const dynamic = 'force-dynamic'

export default async function SchedulePage({ params }: { params: { slug: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session: authSession } } = await supabase.auth.getSession()

  const { data: event } = await supabase
    .from('events')
    .select('id, title, slug, type, starts_at, ends_at')
    .eq('slug', params.slug)
    .single()

  if (!event) notFound()

  const [{ data: tracks }, { data: sessions }, { data: rsvpCounts }, { data: myRsvps }] = await Promise.all([
    supabase.from('event_tracks')
      .select('id, name, color, sort_order')
      .eq('event_id', event.id)
      .order('sort_order'),
    supabase.from('event_sessions')
      .select('id, track_id, title, description, session_type, speaker_name, speaker_bio, room, starts_at, ends_at')
      .eq('event_id', event.id)
      .order('starts_at'),
    supabase.from('session_rsvps')
      .select('session_id')
      .in('session_id',
        // We'll fetch counts per session below; here we just get the list
        // and count client-side. For large events use a view; for now this works.
        ['00000000-0000-0000-0000-000000000000'] // placeholder to avoid empty .in()
      ).limit(0), // not used directly - counts fetched below
    authSession
      ? supabase.from('session_rsvps')
          .select('session_id')
          .eq('member_id', authSession.user.id)
      : Promise.resolve({ data: [] }),
  ])

  // Fetch actual RSVP counts per session for this event's sessions
  const sessionIds = (sessions ?? []).map(s => s.id)
  let countMap: Record<string, number> = {}
  if (sessionIds.length > 0) {
    const { data: countRows } = await supabase
      .from('session_rsvps')
      .select('session_id')
      .in('session_id', sessionIds)
    for (const row of countRows ?? []) {
      countMap[row.session_id] = (countMap[row.session_id] ?? 0) + 1
    }
  }

  const myRsvpSet = new Set((myRsvps ?? []).map((r: { session_id: string }) => r.session_id))

  return (
    <ScheduleClient
      event={event}
      tracks={tracks ?? []}
      sessions={sessions ?? []}
      initialCounts={countMap}
      initialMyRsvps={Array.from(myRsvpSet)}
      isLoggedIn={!!authSession}
    />
  )
}

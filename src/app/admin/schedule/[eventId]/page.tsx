import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import ScheduleAdmin from './ScheduleAdmin'

export const dynamic = 'force-dynamic'

export default async function ScheduleAdminPage({ params }: { params: { eventId: string } }) {
  const cookieStore = cookies()
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )

  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await sb.from('members').select('role').eq('id', user.id).single()
  if (member?.role !== 'board') redirect('/dashboard')

  const { data: event } = await sb.from('events').select('id, title, slug, type').eq('id', params.eventId).single()
  if (!event) redirect('/admin/events')

  const [{ data: tracks }, { data: sessions }, { data: rooms }] = await Promise.all([
    sb.from('event_tracks').select('id, name, color, sort_order').eq('event_id', params.eventId).order('sort_order'),
    sb.from('event_sessions').select('id, track_id, room_id, title, description, session_type, speaker_name, speaker_bio, room, starts_at, ends_at')
      .eq('event_id', params.eventId).order('starts_at'),
    sb.from('event_rooms').select('id, name, capacity').eq('event_id', params.eventId).order('created_at'),
  ])

  return <ScheduleAdmin event={event} initialTracks={tracks ?? []} initialSessions={sessions ?? []} initialRooms={rooms ?? []} />
}

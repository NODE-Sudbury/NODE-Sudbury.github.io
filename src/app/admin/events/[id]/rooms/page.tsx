import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import RoomsClient from './RoomsClient'

export const dynamic = 'force-dynamic'

export default async function RoomsPage({ params }: { params: { id: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: member } = await supabase.from('members').select('role').eq('id', session.user.id).single()
  if (!member || !['board', 'admin', 'super_admin'].includes(member.role)) redirect('/dashboard')

  const { data: event } = await supabase.from('events').select('id, title').eq('id', params.id).single()
  if (!event) redirect('/admin/events')

  // Fetch rooms with session counts via a join
  const { data: rooms } = await supabase
    .from('event_rooms')
    .select('id, name, capacity, notes, created_at')
    .eq('event_id', params.id)
    .order('created_at')

  // Fetch session counts per room
  const roomIds = (rooms ?? []).map(r => r.id)
  let sessionCounts: Record<string, number> = {}
  if (roomIds.length > 0) {
    const { data: sessionRows } = await supabase
      .from('event_sessions')
      .select('room_id')
      .in('room_id', roomIds)
    for (const row of sessionRows ?? []) {
      if (row.room_id) {
        sessionCounts[row.room_id] = (sessionCounts[row.room_id] ?? 0) + 1
      }
    }
  }

  const roomsWithCounts = (rooms ?? []).map(r => ({
    ...r,
    session_count: sessionCounts[r.id] ?? 0,
  }))

  return (
    <RoomsClient
      eventId={params.id}
      eventTitle={event.title}
      initialRooms={roomsWithCounts}
    />
  )
}

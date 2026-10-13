export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import HuntAdmin from './HuntAdmin'

export default async function AdminHuntPage({ params }: { params: { eventId: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: event } = await supabase
    .from('events')
    .select('id, title, slug')
    .eq('id', params.eventId)
    .single()

  if (!event) notFound()

  const { data: hunt } = await supabase
    .from('scavenger_hunts')
    .select('id, title, description, is_active, starts_at, ends_at')
    .eq('event_id', params.eventId)
    .maybeSingle()

  const stations = hunt ? (await supabase
    .from('scavenger_stations')
    .select('id, name, hint_text, points_value, sort_order, qr_token, created_at')
    .eq('hunt_id', hunt.id)
    .order('sort_order', { ascending: true })
  ).data ?? [] : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Scavenger Hunt</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {event.title} - manage QR stations and stamp collection.
        </p>
      </div>
      <HuntAdmin
        eventId={params.eventId}
        initialHunt={hunt ?? null}
        initialStations={(stations as any[]).map(s => ({
          id: s.id,
          name: s.name,
          hint_text: s.hint_text,
          points_value: s.points_value,
          sort_order: s.sort_order,
          qr_token: s.qr_token,
        }))}
      />
    </div>
  )
}

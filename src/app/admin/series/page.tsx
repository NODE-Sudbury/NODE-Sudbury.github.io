export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { SeriesClient } from './SeriesClient'

export default async function AdminSeriesPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: member } = await supabase.from('members').select('role').eq('id', session.user.id).single()
  if (!member || !['board', 'admin'].includes(member.role)) redirect('/dashboard')

  const [{ data: seriesList }, { data: events }] = await Promise.all([
    supabase.from('event_series').select('id, name, slug, is_active, description').order('name'),
    supabase.from('events').select('series_id').not('series_id', 'is', null),
  ])

  const episodeCounts: Record<string, number> = {}
  for (const ev of events ?? []) {
    if (ev.series_id) episodeCounts[ev.series_id] = (episodeCounts[ev.series_id] ?? 0) + 1
  }

  const enriched = (seriesList ?? []).map(s => ({ ...s, episode_count: episodeCounts[s.id] ?? 0 }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Event Series</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage recurring event series and NORCAT episodes.</p>
      </div>
      <SeriesClient initialSeries={enriched} />
    </div>
  )
}

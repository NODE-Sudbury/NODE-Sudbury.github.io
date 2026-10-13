import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function HuntProgressPage({ params }: { params: { huntId: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect(`/login?next=/hunt/${params.huntId}`)

  const { data: hunt } = await supabase
    .from('scavenger_hunts')
    .select('id, title, description, is_active, event_id, events(title, slug)')
    .eq('id', params.huntId)
    .maybeSingle()

  if (!hunt) notFound()

  const { data: stations } = await supabase
    .from('scavenger_stations')
    .select('id, name, hint_text, points_value, sort_order')
    .eq('hunt_id', params.huntId)
    .order('sort_order', { ascending: true })

  const stationList = stations ?? []

  const { data: stamps } = await supabase
    .from('scavenger_stamps')
    .select('id, station_id, stamped_at')
    .eq('member_id', session.user.id)
    .in('station_id', stationList.map(s => s.id))

  const stampMap = new Map((stamps ?? []).map(s => [s.station_id, s]))
  const totalPoints = stationList.reduce((acc, s) => stampMap.has(s.id) ? acc + s.points_value : acc, 0)
  const collectedCount = stampMap.size
  const totalCount = stationList.length
  const allDone = totalCount > 0 && collectedCount === totalCount
  const pct = totalCount > 0 ? Math.round((collectedCount / totalCount) * 100) : 0

  const event = Array.isArray(hunt.events) ? hunt.events[0] : hunt.events

  return (
    <div className="min-h-screen bg-[#0b0e14] text-[#c9d1e8]">
      <div className="border-b border-[#252b3a] px-6 py-3 flex items-center gap-3">
        <Link href="/" className="text-sm font-bold tracking-widest text-[#f0e6d3]">NODE</Link>
        <span className="text-[#3a3f52]">/</span>
        {event && (
          <>
            <Link href={`/events/${event.slug}`} className="text-sm text-[#5a6278] hover:text-[#c9d1e8] transition-colors truncate max-w-[160px]">{event.title}</Link>
            <span className="text-[#3a3f52]">/</span>
          </>
        )}
        <span className="text-sm text-[#5a6278]">Scavenger Hunt</span>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {allDone && (
          <div className="px-5 py-4 rounded-xl border bg-[#9ece6a]/10 border-[#9ece6a]/20 text-center">
            <p className="text-2xl mb-1">🎉</p>
            <p className="text-sm font-semibold text-[#9ece6a]">Hunt complete! You earned {totalPoints} points.</p>
          </div>
        )}

        <div>
          <h1 className="text-xl font-bold text-white">{hunt.title}</h1>
          {hunt.description && <p className="text-sm text-[#5a6278] mt-1">{hunt.description}</p>}
        </div>

        <div className="bg-[#13161f] border border-[#252b3a] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#5a6278]">Progress</span>
            <span className="font-medium text-white">{collectedCount} / {totalCount} stations</span>
          </div>
          <div className="w-full h-2 bg-[#252b3a] rounded-full overflow-hidden">
            <div className="h-2 bg-[#9ece6a] rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center justify-between text-xs text-[#5a6278]">
            <span>{pct}% complete</span>
            <span>{totalPoints} pts earned</span>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-white">Stations</h2>
          {stationList.length === 0 && (
            <p className="text-sm text-[#5a6278]">No stations set up yet.</p>
          )}
          {stationList.map((s, i) => {
            const collected = stampMap.get(s.id)
            return (
              <div
                key={s.id}
                className={`flex items-center gap-4 px-4 py-3 rounded-lg border ${
                  collected ? 'bg-[#9ece6a]/5 border-[#9ece6a]/20' : 'bg-[#13161f] border-[#252b3a]'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  collected ? 'bg-[#9ece6a] text-[#0b0e14]' : 'bg-[#252b3a] text-[#5a6278]'
                }`}>
                  {collected ? '✓' : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{s.name}</p>
                  {collected && (
                    <p className="text-[10px] text-[#5a6278]">
                      Collected {new Date(collected.stamped_at).toLocaleString('en-CA', { timeZone: 'America/Toronto', dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  )}
                  {!collected && s.hint_text && (
                    <p className="text-[10px] text-[#5a6278] italic">{s.hint_text}</p>
                  )}
                </div>
                <span className={`text-xs font-semibold shrink-0 ${collected ? 'text-[#9ece6a]' : 'text-[#5a6278]'}`}>
                  +{s.points_value} pts
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

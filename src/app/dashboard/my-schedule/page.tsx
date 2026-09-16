import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type RsvpRow = {
  session_id: string
  created_at: string
  event_sessions: {
    id: string
    title: string
    session_type: string
    speaker_name: string | null
    room: string | null
    starts_at: string | null
    ends_at: string | null
    event_id: string
    events: {
      id: string
      title: string
      slug: string
    } | null
  } | null
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-CA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Toronto',
  })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Toronto',
  })
}

const SESSION_TYPE_COLOR: Record<string, string> = {
  keynote:       '#f59e0b',
  talk:          '#38bdf8',
  workshop:      '#a78bfa',
  panel:         '#34d399',
  lightning_talk:'#fb923c',
  break:         '#6b7280',
  lunch:         '#6b7280',
  networking:    '#22d3ee',
  sponsor_demo:  '#f472b6',
  codelab:       '#86efac',
}

const SESSION_TYPE_LABEL: Record<string, string> = {
  keynote:       'Keynote',
  talk:          'Talk',
  workshop:      'Workshop',
  panel:         'Panel',
  lightning_talk:'Lightning',
  break:         'Break',
  lunch:         'Lunch',
  networking:    'Networking',
  sponsor_demo:  'Sponsor Demo',
  codelab:       'Codelab',
}

export default async function MySchedulePage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: rsvpRows } = await supabase
    .from('session_rsvps')
    .select(`
      session_id,
      created_at,
      event_sessions (
        id,
        title,
        session_type,
        speaker_name,
        room,
        starts_at,
        ends_at,
        event_id,
        events ( id, title, slug )
      )
    `)
    .eq('member_id', session.user.id)
    .order('created_at', { ascending: false })

  const rows = (rsvpRows ?? []) as unknown as RsvpRow[]

  // Group by event
  const byEvent = new Map<string, { eventTitle: string; eventSlug: string; sessions: RsvpRow[] }>()

  for (const row of rows) {
    const es = row.event_sessions
    if (!es || !es.events) continue
    const eventId = es.event_id
    if (!byEvent.has(eventId)) {
      byEvent.set(eventId, {
        eventTitle: es.events.title,
        eventSlug: es.events.slug,
        sessions: [],
      })
    }
    byEvent.get(eventId)!.sessions.push(row)
  }

  // Sort each group's sessions by start time
  for (const group of byEvent.values()) {
    group.sessions.sort((a, b) => {
      const ta = a.event_sessions?.starts_at ?? ''
      const tb = b.event_sessions?.starts_at ?? ''
      return ta.localeCompare(tb)
    })
  }

  const groups = Array.from(byEvent.values())

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e2e8f0]">
      {/* Header */}
      <div className="border-b border-[#252b3a] px-6 py-3 flex items-center gap-3">
        <Link href="/" className="text-sm font-bold tracking-widest text-[#f0e6d3]">NODE</Link>
        <span className="text-[#3a3f52]">/</span>
        <Link href="/dashboard" className="text-sm text-[#8892a4] hover:text-[#e2e8f0]">Dashboard</Link>
        <span className="text-[#3a3f52]">/</span>
        <span className="text-sm text-[#8892a4]">My Schedule</span>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">My Schedule</h1>
          <p className="text-sm text-[#8892a4]">Sessions you have RSVPed to across all events.</p>
        </div>

        {groups.length === 0 ? (
          <div className="bg-[#13161f] border border-[#252b3a] rounded-lg p-12 text-center">
            <p className="text-[#8892a4] mb-4">You have not RSVPed to any sessions yet.</p>
            <Link
              href="/events"
              className="px-5 py-2 rounded-md bg-[#38bdf8] text-black text-sm font-semibold inline-block"
            >
              Browse Events
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map(group => (
              <div key={group.eventSlug}>
                {/* Event header */}
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#252b3a]">
                  <Link
                    href={`/events/${group.eventSlug}`}
                    className="text-base font-semibold text-white hover:text-[#38bdf8] transition-colors"
                  >
                    {group.eventTitle}
                  </Link>
                  <Link
                    href={`/events/${group.eventSlug}/schedule`}
                    className="text-xs text-[#38bdf8] hover:underline"
                  >
                    View full schedule
                  </Link>
                </div>

                {/* Sessions list */}
                <div className="space-y-2">
                  {group.sessions.map(row => {
                    const es = row.event_sessions!
                    const chipColor = SESSION_TYPE_COLOR[es.session_type] ?? '#6b7280'
                    const chipLabel = SESSION_TYPE_LABEL[es.session_type] ?? es.session_type

                    return (
                      <div
                        key={row.session_id}
                        className="bg-[#13161f] border border-[#252b3a] rounded-lg p-4 flex gap-4 items-start"
                      >
                        {/* Time column */}
                        <div className="w-24 shrink-0 text-right">
                          {es.starts_at ? (
                            <>
                              <p className="text-xs text-[#8892a4] tabular-nums">{fmtDate(es.starts_at)}</p>
                              <p className="text-xs font-medium text-[#e2e8f0] tabular-nums mt-0.5">{fmtTime(es.starts_at)}</p>
                              {es.ends_at && (
                                <p className="text-[10px] text-[#4a5568] tabular-nums">{fmtTime(es.ends_at)}</p>
                              )}
                            </>
                          ) : (
                            <p className="text-xs text-[#4a5568]">TBD</p>
                          )}
                        </div>

                        {/* Divider */}
                        <div className="w-px self-stretch bg-[#252b3a] shrink-0" />

                        {/* Session info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded text-[#0b0e14] shrink-0"
                              style={{ backgroundColor: chipColor }}
                            >
                              {chipLabel}
                            </span>
                            {es.room && (
                              <span className="text-[10px] text-[#4a5568] border border-[#252b3a] px-1.5 py-0.5 rounded">
                                {es.room}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-white leading-tight">{es.title}</p>
                          {es.speaker_name && (
                            <p className="text-xs text-[#8892a4] mt-1">{es.speaker_name}</p>
                          )}
                        </div>

                        {/* RSVPed badge */}
                        <div className="shrink-0">
                          <span className="text-[10px] font-semibold text-[#22c55e] border border-[#22c55e]/30 px-2 py-1 rounded bg-[#22c55e]/5">
                            RSVPed
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

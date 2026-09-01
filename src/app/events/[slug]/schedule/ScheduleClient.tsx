'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'

type Track = { id: string; name: string; color: string; sort_order: number }
type Session = {
  id: string
  track_id: string | null
  title: string
  description: string | null
  session_type: string
  speaker_name: string | null
  speaker_bio: string | null
  room: string | null
  starts_at: string | null
  ends_at: string | null
}
type Event = { id: string; title: string; slug: string; type: string; starts_at: string; ends_at: string | null }

const TYPE_CHIP: Record<string, { label: string; color: string }> = {
  keynote:       { label: 'Keynote',      color: '#f59e0b' },
  talk:          { label: 'Talk',         color: '#38bdf8' },
  workshop:      { label: 'Workshop',     color: '#a78bfa' },
  panel:         { label: 'Panel',        color: '#34d399' },
  lightning_talk:{ label: 'Lightning',   color: '#fb923c' },
  break:         { label: 'Break',        color: '#6b7280' },
  lunch:         { label: 'Lunch',        color: '#6b7280' },
  networking:    { label: 'Networking',   color: '#22d3ee' },
  sponsor_demo:  { label: 'Sponsor Demo', color: '#f472b6' },
  codelab:       { label: 'Codelab',      color: '#86efac' },
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Toronto' })
}

function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Toronto' })
}

function isoDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })
}

type Props = {
  event: Event
  tracks: Track[]
  sessions: Session[]
  initialCounts: Record<string, number>
  initialMyRsvps: string[]
  isLoggedIn: boolean
}

export default function ScheduleClient({ event, tracks, sessions, initialCounts, initialMyRsvps, isLoggedIn }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [hiddenTracks, setHiddenTracks] = useState<Set<string>>(new Set())
  const [myRsvps, setMyRsvps] = useState<Set<string>>(new Set(initialMyRsvps))
  const [rsvpCounts, setRsvpCounts] = useState<Record<string, number>>(initialCounts)
  const [rsvpLoading, setRsvpLoading] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'all' | 'mine'>('all')
  const now = new Date()

  const days = useMemo(() => {
    const s = sessions.filter(s => s.starts_at)
    const dayMap = new Map<string, Session[]>()
    for (const sess of s) {
      const d = isoDate(sess.starts_at!)
      if (!dayMap.has(d)) dayMap.set(d, [])
      dayMap.get(d)!.push(sess)
    }
    return Array.from(dayMap.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [sessions])

  const [activeDay, setActiveDay] = useState(() => days[0]?.[0] ?? '')

  const todaySessions = useMemo(() => {
    const daySessions = days.find(([d]) => d === activeDay)?.[1] ?? []
    return daySessions
      .filter(s => {
        if (viewMode === 'mine' && !myRsvps.has(s.id)) return false
        if (s.track_id && hiddenTracks.has(s.track_id)) return false
        return true
      })
      .sort((a, b) => (a.starts_at ?? '').localeCompare(b.starts_at ?? ''))
  }, [days, activeDay, hiddenTracks, viewMode, myRsvps])

  const timeSlots = useMemo(() => {
    const times = new Map<string, Session[]>()
    for (const s of todaySessions) {
      const key = s.starts_at ?? 'unscheduled'
      if (!times.has(key)) times.set(key, [])
      times.get(key)!.push(s)
    }
    return Array.from(times.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [todaySessions])

  function toggleTrack(id: string) {
    setHiddenTracks(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function isNow(s: Session) {
    if (!s.starts_at || !s.ends_at) return false
    const start = new Date(s.starts_at)
    const end = new Date(s.ends_at)
    return now >= start && now <= end
  }

  const toggleRsvp = useCallback(async (sessionId: string) => {
    if (!isLoggedIn) {
      window.location.href = `/login?next=/events/${event.slug}/schedule`
      return
    }
    if (rsvpLoading.has(sessionId)) return

    setRsvpLoading(prev => new Set(prev).add(sessionId))

    // Optimistic update
    const wasRsvped = myRsvps.has(sessionId)
    setMyRsvps(prev => {
      const next = new Set(prev)
      wasRsvped ? next.delete(sessionId) : next.add(sessionId)
      return next
    })
    setRsvpCounts(prev => ({
      ...prev,
      [sessionId]: Math.max(0, (prev[sessionId] ?? 0) + (wasRsvped ? -1 : 1)),
    }))

    try {
      const res = await fetch(`/api/events/${event.slug}/schedule/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      })
      if (res.ok) {
        const data = await res.json()
        setMyRsvps(prev => {
          const next = new Set(prev)
          data.rsvped ? next.add(sessionId) : next.delete(sessionId)
          return next
        })
        setRsvpCounts(prev => ({ ...prev, [sessionId]: data.count }))
      } else {
        // Revert optimistic update on error
        setMyRsvps(prev => {
          const next = new Set(prev)
          wasRsvped ? next.add(sessionId) : next.delete(sessionId)
          return next
        })
        setRsvpCounts(prev => ({
          ...prev,
          [sessionId]: Math.max(0, (prev[sessionId] ?? 0) + (wasRsvped ? 1 : -1)),
        }))
      }
    } catch {
      // Revert on network error
      setMyRsvps(prev => {
        const next = new Set(prev)
        wasRsvped ? next.add(sessionId) : next.delete(sessionId)
        return next
      })
      setRsvpCounts(prev => ({
        ...prev,
        [sessionId]: Math.max(0, (prev[sessionId] ?? 0) + (wasRsvped ? 1 : -1)),
      }))
    } finally {
      setRsvpLoading(prev => {
        const next = new Set(prev)
        next.delete(sessionId)
        return next
      })
    }
  }, [event.slug, isLoggedIn, myRsvps, rsvpLoading])

  const myRsvpCount = myRsvps.size

  return (
    <div className="min-h-screen bg-[#0b0e14] text-[#c9d1e8]">
      {/* Header */}
      <div className="border-b border-[#252b3a] px-6 py-3 flex items-center gap-3">
        <Link href="/" className="text-sm font-bold tracking-widest text-[#f0e6d3]">NODE</Link>
        <span className="text-[#3a3f52]">/</span>
        <Link href={`/events/${event.slug}`} className="text-sm text-[#5a6278] hover:text-[#c9d1e8]">{event.title}</Link>
        <span className="text-[#3a3f52]">/</span>
        <span className="text-sm text-[#5a6278]">Schedule</span>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">{event.title}</h1>
            <p className="text-sm text-[#5a6278]">Full Schedule</p>
          </div>
          {isLoggedIn && (
            <Link
              href="/dashboard/my-schedule"
              className="text-xs text-[#38bdf8] hover:underline flex items-center gap-1"
            >
              View all my RSVPs
            </Link>
          )}
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-20 text-[#5a6278]">Schedule not yet published.</div>
        ) : (
          <>
            {/* View mode tabs */}
            <div className="flex gap-2 mb-5">
              <button
                onClick={() => setViewMode('all')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors border ${
                  viewMode === 'all'
                    ? 'bg-[#38bdf8]/15 text-[#38bdf8] border-[#38bdf8]/30'
                    : 'border-[#252b3a] text-[#5a6278] hover:text-[#c9d1e8] bg-transparent'
                }`}
              >
                All Sessions
              </button>
              <button
                onClick={() => setViewMode('mine')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors border flex items-center gap-2 ${
                  viewMode === 'mine'
                    ? 'bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30'
                    : 'border-[#252b3a] text-[#5a6278] hover:text-[#c9d1e8] bg-transparent'
                }`}
              >
                My Schedule
                {myRsvpCount > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    viewMode === 'mine' ? 'bg-[#22c55e]/20 text-[#22c55e]' : 'bg-[#252b3a] text-[#8892a4]'
                  }`}>
                    {myRsvpCount}
                  </span>
                )}
              </button>
            </div>

            {/* Day tabs */}
            {days.length > 1 && (
              <div className="flex gap-2 mb-5 flex-wrap">
                {days.map(([d]) => (
                  <button
                    key={d}
                    onClick={() => setActiveDay(d)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeDay === d
                        ? 'bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/30'
                        : 'bg-[#13161f] text-[#5a6278] border border-[#252b3a] hover:text-[#c9d1e8]'
                    }`}
                  >
                    {fmtDay(d + 'T00:00:00')}
                  </button>
                ))}
              </div>
            )}

            {/* Track filter pills */}
            {tracks.length > 0 && viewMode === 'all' && (
              <div className="flex gap-2 mb-5 flex-wrap">
                {tracks.map(t => (
                  <button
                    key={t.id}
                    onClick={() => toggleTrack(t.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      hiddenTracks.has(t.id)
                        ? 'border-[#252b3a] text-[#3a3f52] bg-transparent'
                        : 'border-transparent text-[#0b0e14] font-semibold'
                    }`}
                    style={hiddenTracks.has(t.id) ? {} : { backgroundColor: t.color ?? '#38bdf8' }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}

            {/* Empty state for My Schedule */}
            {viewMode === 'mine' && todaySessions.length === 0 && (
              <div className="text-center py-16 text-[#5a6278]">
                <p className="mb-2">No RSVPs for this day.</p>
                <button
                  onClick={() => setViewMode('all')}
                  className="text-xs text-[#38bdf8] hover:underline"
                >
                  Browse all sessions
                </button>
              </div>
            )}

            {/* Schedule grid */}
            <div className="space-y-1">
              {timeSlots.map(([timeKey, slotSessions]) => (
                <div key={timeKey} className="flex gap-4 items-start">
                  {/* Time label */}
                  <div className="w-16 shrink-0 pt-3 text-right">
                    <span className="text-xs text-[#5a6278] tabular-nums">
                      {timeKey !== 'unscheduled' ? fmtTime(timeKey) : ''}
                    </span>
                  </div>

                  {/* Sessions in this slot */}
                  <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(1, slotSessions.length)}, 1fr)` }}>
                    {slotSessions.map(s => {
                      const track = tracks.find(t => t.id === s.track_id)
                      const chip = TYPE_CHIP[s.session_type] ?? { label: s.session_type, color: '#6b7280' }
                      const live = isNow(s)
                      const expanded = expandedId === s.id
                      const rsvped = myRsvps.has(s.id)
                      const loading = rsvpLoading.has(s.id)
                      const count = rsvpCounts[s.id] ?? 0

                      return (
                        <div
                          key={s.id}
                          className={`rounded-lg border p-3 transition-all ${
                            live
                              ? 'border-[#9ece6a]/40 bg-[#9ece6a]/5'
                              : rsvped
                              ? 'border-[#22c55e]/30 bg-[#22c55e]/5'
                              : 'border-[#252b3a] bg-[#13161f] hover:border-[#3a3f52]'
                          }`}
                        >
                          {/* Top row: chips + RSVP button */}
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 text-[#0b0e14]"
                                style={{ backgroundColor: chip.color }}
                              >
                                {chip.label}
                              </span>
                              {live && (
                                <span className="text-[10px] font-bold text-[#9ece6a] border border-[#9ece6a]/30 px-1.5 py-0.5 rounded shrink-0">
                                  LIVE
                                </span>
                              )}
                            </div>
                            {isLoggedIn && (
                              <button
                                onClick={e => { e.stopPropagation(); toggleRsvp(s.id) }}
                                disabled={loading}
                                className={`shrink-0 text-[10px] font-semibold px-2 py-1 rounded border transition-colors ${
                                  rsvped
                                    ? 'border-[#22c55e]/40 text-[#22c55e] bg-[#22c55e]/10 hover:bg-[#22c55e]/20'
                                    : 'border-[#252b3a] text-[#8892a4] hover:text-white hover:border-[#3a3f52] bg-transparent'
                                } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                title={rsvped ? 'Remove RSVP' : 'RSVP to this session'}
                              >
                                {loading ? '...' : rsvped ? 'RSVPed' : 'RSVP'}
                              </button>
                            )}
                          </div>

                          {/* Clickable body */}
                          <div
                            className="cursor-pointer"
                            onClick={() => setExpandedId(expanded ? null : s.id)}
                          >
                            <p className="text-sm font-medium text-white leading-tight">{s.title}</p>

                            {s.speaker_name && (
                              <p className="text-xs text-[#5a6278] mt-1">{s.speaker_name}</p>
                            )}

                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {track && (
                                <span
                                  className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                                  style={{ backgroundColor: `${track.color}20`, color: track.color }}
                                >
                                  {track.name}
                                </span>
                              )}
                              {s.room && (
                                <span className="text-[10px] text-[#3a3f52]">{s.room}</span>
                              )}
                              {s.ends_at && s.starts_at && (
                                <span className="text-[10px] text-[#3a3f52]">
                                  {fmtTime(s.starts_at)} - {fmtTime(s.ends_at)}
                                </span>
                              )}
                              {count > 0 && (
                                <span className="text-[10px] text-[#4a5568]">
                                  {count} {count === 1 ? 'person' : 'people'} going
                                </span>
                              )}
                            </div>

                            {/* Expanded details */}
                            {expanded && (
                              <div className="mt-3 pt-3 border-t border-[#252b3a]">
                                {s.description && (
                                  <p className="text-xs text-[#8892a4] leading-relaxed mb-2">{s.description}</p>
                                )}
                                {s.speaker_bio && (
                                  <div>
                                    <p className="text-[10px] font-semibold text-[#5a6278] uppercase tracking-wider mb-1">About the speaker</p>
                                    <p className="text-xs text-[#8892a4] leading-relaxed">{s.speaker_bio}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type EventRow = {
  id: string
  title: string
  slug: string
  description: string | null
  short_description: string | null
  type: string
  status: string
  starts_at: string
  ends_at: string | null
  max_capacity: number | null
  is_featured: boolean | null
  thumbnail_url: string | null
  cover_image_url: string | null
  attendance_mode: string | null
  location: { name: string; city: string; is_virtual: boolean } | null
  ticket_types: { pricing_model: string; price_cents: number }[]
  registrations: { id: string }[]
}

const TYPE_COLORS: Record<string, string> = {
  meetup:          'bg-blue-500/15 text-blue-400 border-blue-500/20',
  workshop:        'bg-purple-500/15 text-purple-400 border-purple-500/20',
  hackathon:       'bg-amber-500/15 text-amber-400 border-amber-500/20',
  conference:      'bg-teal-500/15 text-teal-400 border-teal-500/20',
  multi_track:     'bg-teal-500/15 text-teal-400 border-teal-500/20',
  norcat_series:   'bg-pink-500/15 text-pink-400 border-pink-500/20',
  unconference:    'bg-green-500/15 text-green-400 border-green-500/20',
  study_group:     'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
  demo_day:        'bg-orange-500/15 text-orange-400 border-orange-500/20',
  game_jam:        'bg-rose-500/15 text-rose-400 border-rose-500/20',
  job_fair:        'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  competition_ctf: 'bg-red-500/15 text-red-400 border-red-500/20',
  competition_prog:'bg-red-500/15 text-red-400 border-red-500/20',
  async_event:     'bg-gray-500/15 text-gray-400 border-gray-500/20',
}

const TYPE_LABEL: Record<string, string> = {
  meetup: 'Meetup', workshop: 'Workshop', hackathon: 'Hackathon',
  conference: 'Conference', multi_track: 'Multi-Track', norcat_series: 'NORCAT Series',
  unconference: 'Unconference', study_group: 'Study Group', demo_day: 'Demo Day',
  game_jam: 'Game Jam', job_fair: 'Job Fair', competition_ctf: 'CTF',
  competition_prog: 'Programming', async_event: 'Async',
}

const FILTER_TYPES = ['meetup', 'workshop', 'hackathon'] as const

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    timeZone: 'America/Toronto',
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-CA', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Toronto',
  })
}

function isPast(iso: string) {
  return new Date(iso) < new Date()
}

function getPrice(ticket_types: { pricing_model: string; price_cents: number }[]) {
  if (!ticket_types.length) return null
  const hasPaid = ticket_types.some(t => t.pricing_model === 'paid' && t.price_cents > 0)
  if (!hasPaid) return 'Free'
  const min = Math.min(...ticket_types.filter(t => t.price_cents > 0).map(t => t.price_cents))
  return `From $${(min / 100).toFixed(0)}`
}

type ChapterRow = { id: string; name: string; slug: string | null }

export default function EventsClient({
  events,
  chapters = [],
  isBoard = false,
}: {
  events: EventRow[]
  chapters?: ChapterRow[]
  isBoard?: boolean
}) {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past' | string>('all')
  const [chapterFilter, setChapterFilter] = useState<string>('all')

  const showChapterFilter = chapters.length > 1

  const filtered = events.filter(e => {
    if (filter === 'upcoming') return !isPast(e.starts_at)
    if (filter === 'past') return isPast(e.starts_at)
    if (FILTER_TYPES.includes(filter as any)) return e.type === filter
    return true
  }).filter(e => {
    if (!showChapterFilter || chapterFilter === 'all') return true
    return (e as any).chapter_id === chapterFilter
  })

  return (
    <div className="min-h-screen bg-[#0b0e14] text-[#c9d1e8]">
      {/* Top bar */}
      <div className="border-b border-[#252b3a] px-6 py-3 flex items-center gap-3">
        <Link href="/" className="text-sm font-bold tracking-widest text-[#f0e6d3]">NODE</Link>
        <span className="text-[#3a3f52]">/</span>
        <span className="text-sm text-[#5a6278]">Events</span>
        <div className="ml-auto">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-[#5a6278] hover:text-[#c9d1e8] text-xs">
              Dashboard
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white mb-1">Events</h1>
          <p className="text-sm text-[#5a6278]">What's happening in Northern Ontario tech</p>
        </div>

        {/* Filters */}
        <div role="group" aria-label="Filter events" className="flex flex-wrap gap-2 mb-4">
          {(['all', 'upcoming', 'past', ...FILTER_TYPES] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors capitalize ${
                filter === f
                  ? 'bg-[#f0e6d3] text-[#0b0e14] border-[#f0e6d3]'
                  : 'bg-transparent text-[#5a6278] border-[#252b3a] hover:border-[#f0e6d3]/30 hover:text-[#c9d1e8]'
              }`}
            >
              {f === 'all' ? 'All' : f === 'upcoming' ? 'Upcoming' : f === 'past' ? 'Past' : TYPE_LABEL[f] ?? f}
            </button>
          ))}
        </div>

        {/* Chapter filter - only shown when multiple chapters exist */}
        {showChapterFilter && (
          <div role="group" aria-label="Filter by chapter" className="flex flex-wrap gap-2 mb-8">
            <span className="text-xs text-[#5a6278] self-center mr-1">Chapter:</span>
            {[{ id: 'all', name: 'All' }, ...chapters].map(c => (
              <button
                key={c.id}
                onClick={() => setChapterFilter(c.id)}
                aria-pressed={chapterFilter === c.id}
                className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
                  chapterFilter === c.id
                    ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                    : 'bg-transparent text-[#5a6278] border-[#252b3a] hover:border-sky-500/30 hover:text-[#c9d1e8]'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#5a6278] text-sm">No events found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(event => {
              const past = isPast(event.starts_at)
              const price = getPrice(event.ticket_types)
              const registered = event.registrations.length
              const spotsLeft = event.max_capacity ? event.max_capacity - registered : null
              const loc = Array.isArray(event.location) ? event.location[0] : event.location
              const locationName = loc?.is_virtual ? 'Online' : loc?.name ?? 'TBD'

              return (
                <Card key={event.id} className="bg-[#13161f] border-[#252b3a] hover:border-[#f0e6d3]/20 transition-colors">
                  <CardContent className="p-5 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${TYPE_COLORS[event.type] ?? TYPE_COLORS.meetup}`}>
                          {TYPE_LABEL[event.type] ?? event.type}
                        </span>
                        {isBoard && event.status === 'draft' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border border-yellow-500/40 bg-yellow-500/10 text-yellow-400">
                            Draft
                          </span>
                        )}
                      </div>
                      {price && (
                        <span className="text-[10px] font-medium text-[#9ece6a] bg-[#9ece6a]/10 border border-[#9ece6a]/20 px-2 py-0.5 rounded">
                          {price}
                        </span>
                      )}
                    </div>

                    <div>
                      <h2 className="font-semibold text-white text-sm leading-snug line-clamp-2 mb-1">{event.title}</h2>
                      {event.short_description && (
                        <p className="text-xs text-[#5a6278] line-clamp-2 leading-relaxed">{event.short_description}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1 text-xs text-[#5a6278]">
                      <span>{formatDate(event.starts_at)} · {formatTime(event.starts_at)}</span>
                      <span>{locationName}</span>
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      {spotsLeft !== null && spotsLeft < 20 && spotsLeft > 0 && (
                        <span className="text-[10px] text-[#e0af68]">{spotsLeft} spots left</span>
                      )}
                      {spotsLeft === 0 && (
                        <span className="text-[10px] text-[#f7768e]">Sold out</span>
                      )}
                      <div className="ml-auto">
                        <Link href={`/events/${event.slug}`}>
                          <Button
                            size="sm"
                            variant={past ? 'outline' : 'default'}
                            className={past
                              ? 'text-xs border-[#252b3a] text-[#5a6278] hover:text-[#c9d1e8] h-7'
                              : 'text-xs bg-[#f0e6d3] text-[#0b0e14] hover:bg-[#e8ddc8] h-7 font-medium'
                            }
                          >
                            {past ? 'View' : 'Register'}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

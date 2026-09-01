'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent } from '@/components/ui/card'
import RegisterModal from '@/components/events/RegisterModal'
import { ShareButtons } from '@/components/events/ShareButtons'
import VenueMap from '@/components/events/VenueMap'

type TicketType = {
  id: string
  name: string
  description: string | null
  pricing_model: string
  price_cents: number
  quantity_available: number | null
  quantity_sold: number | null
  is_active: boolean
}

type TicketTier = {
  id: string
  name: string
  price_cents: number
  capacity: number | null
  description: string | null
  is_active: boolean
  sort_order: number
}

type Whiteboard = { id: string; title: string }
type Speaker = { id: string; name: string; title?: string | null; company?: string | null; bio?: string | null; photo_url?: string | null; talk_title?: string | null; session_type: string; display_order: number }
type Mentor = { id: string; name: string; title?: string | null; company?: string | null; bio?: string | null; avatar_url?: string | null; expertise_tags: string[]; sort_order: number }

type CarpoolOffer = {
  id: string
  user_name: string
  seats: number
  from_area: string
  time: string
  note?: string | null
}

type CarpoolRequest = {
  id: string
  user_name: string
  pickup_area: string
  note?: string | null
}

type CarpoolData = {
  offers: CarpoolOffer[]
  requests: CarpoolRequest[]
}

type EventDetailProps = {
  searchParams?: { registration?: string }
  searchboards?: Whiteboard[]
  activeHunt?: { id: string; title: string } | null
  speakers?: Speaker[]
  mentors?: Mentor[]
  ticketTiers?: TicketTier[]
  userId?: string | null
  event: {
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
    recording_url?: string | null
    photos_url?: string | null
    recap_url?: string | null
    stream_url?: string | null
    is_live?: boolean
    venue_address?: string | null
    venue_name?: string | null
    carpool_enabled?: boolean | null
    location: { name: string; address?: string; city: string; province?: string; is_virtual: boolean; join_link_visibility?: string } | null
    ticket_types: TicketType[]
    registrations: { id: string }[]
    event_sessions: { id: string; title: string; starts_at: string; ends_at: string; room: string | null }[]
    event_tag_links: { tag: { name: string; color: string } | null }[]
  }
}

const TYPE_LABEL: Record<string, string> = {
  meetup: 'Meetup', workshop: 'Workshop', hackathon: 'Hackathon',
  conference: 'Conference', multi_track: 'Multi-Track', norcat_series: 'NORCAT Series',
  unconference: 'Unconference', study_group: 'Study Group', demo_day: 'Demo Day',
  game_jam: 'Game Jam', job_fair: 'Job Fair', competition_ctf: 'CTF',
  competition_prog: 'Programming', async_event: 'Async',
}

const TYPE_COLORS: Record<string, string> = {
  meetup: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  workshop: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  hackathon: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  conference: 'bg-teal-500/15 text-teal-400 border-teal-500/20',
  norcat_series: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
}

function fmt(iso: string, opts: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleString('en-CA', { ...opts, timeZone: 'America/Toronto' })
}

function formatTicketPrice(t: TicketType) {
  if (t.pricing_model === 'free') return 'Free'
  if (t.pricing_model === 'donation') return 'Pay what you can'
  if (t.pricing_model === 'member_only') return 'Members only'
  return `$${(t.price_cents / 100).toFixed(2)} CAD`
}

function formatTierPrice(cents: number) {
  if (cents === 0) return 'Free'
  return `$${(cents / 100).toFixed(2)} CAD`
}

/** Format a Date as YYYYMMDDTHHMMSSz for Google Calendar and ICS */
function toCalDateTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  )
}

/** Build a minimal ICS VCALENDAR string for one event */
function buildIcs(opts: {
  title: string
  starts_at: string
  ends_at: string | null
  description: string | null
  location: string
}): string {
  const dtStart = toCalDateTime(opts.starts_at)
  const dtEnd = opts.ends_at ? toCalDateTime(opts.ends_at) : dtStart
  const escape = (s: string) => s.replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NODE Sudbury//Event//EN',
    'BEGIN:VEVENT',
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escape(opts.title)}`,
    opts.description ? `DESCRIPTION:${escape(opts.description)}` : null,
    opts.location ? `LOCATION:${escape(opts.location)}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')
  return lines
}

/** Build a Google Calendar deep-link URL */
function buildGCalUrl(opts: {
  title: string
  starts_at: string
  ends_at: string | null
  description: string | null
  location: string
}): string {
  const base = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
  const params = new URLSearchParams({
    text: opts.title,
    dates: `${toCalDateTime(opts.starts_at)}/${toCalDateTime(opts.ends_at ?? opts.starts_at)}`,
    ...(opts.description ? { details: opts.description } : {}),
    ...(opts.location ? { location: opts.location } : {}),
  })
  return `${base}&${params.toString()}`
}

// Stream embed helpers

function getYouTubeVideoId(url: string): string | null {
  const watchMatch = url.match(/youtube\.com\/watch\?v=([^&]+)/)
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/)
  return (watchMatch ?? shortMatch)?.[1] ?? null
}

function getTwitchChannel(url: string): string | null {
  const match = url.match(/twitch\.tv\/([^/?&#]+)/)
  return match?.[1] ?? null
}

type StreamPlatform = 'youtube' | 'twitch' | 'other'

function detectStreamPlatform(url: string): StreamPlatform {
  if (url.includes('youtube.com/watch?v=') || url.includes('youtu.be/')) return 'youtube'
  if (url.includes('twitch.tv/')) return 'twitch'
  return 'other'
}

export default function EventDetail({ event, searchParams, searchboards = [], activeHunt, speakers = [], mentors = [], ticketTiers = [], userId }: EventDetailProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const activeTiers = ticketTiers.filter(t => t.is_active)
  const [selectedTierId, setSelectedTierId] = useState<string | null>(
    activeTiers.length > 0 ? activeTiers[0].id : null
  )
  const isPast = new Date(event.starts_at) < new Date()
  const isCancelled = event.status === 'cancelled' || event.status === 'postponed'
  const hasPostEventLinks = event.recording_url || event.photos_url || event.recap_url
  const registered = event.registrations.length
  const tags = event.event_tag_links.map(l => l.tag).filter(Boolean)

  const loc = Array.isArray(event.location) ? event.location[0] : event.location
  const locationLine = loc?.is_virtual
    ? 'Online'
    : [loc?.name, loc?.city, loc?.province].filter(Boolean).join(', ')

  const hasPhysicalLocation = !!event.venue_address || (loc != null && !loc.is_virtual)

  const venueMapAddress = event.venue_address || loc?.address || locationLine
  const venueMapName = event.venue_name || loc?.name || event.title

  // --- Add to Calendar state ---
  const [calOpen, setCalOpen] = useState(false)
  const calRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!calOpen) return
    function handleClick(e: MouseEvent) {
      if (calRef.current && !calRef.current.contains(e.target as Node)) {
        setCalOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [calOpen])

  const calOpts = {
    title: event.title,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    description: event.description,
    location: locationLine,
  }
  const gCalUrl = buildGCalUrl(calOpts)
  const icsContent = buildIcs(calOpts)
  const icsHref = `data:text/calendar;charset=utf8,${encodeURIComponent(icsContent)}`

  // --- I am Interested state ---
  const [interestedCount, setInterestedCount] = useState<number | null>(null)
  const [isInterested, setIsInterested] = useState(false)
  const [interestLoading, setInterestLoading] = useState(false)

  const showInterest = event.status === 'published' && !(event.max_capacity && registered >= event.max_capacity)

  useEffect(() => {
    if (!showInterest) return
    fetch(`/api/events/${event.slug}/interest`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setInterestedCount(data.interested_count ?? 0)
          setIsInterested(data.is_interested ?? false)
        }
      })
      .catch(() => {})
  }, [event.slug, showInterest])

  async function handleInterestToggle() {
    if (!userId || interestLoading) return
    setInterestLoading(true)
    try {
      const res = await fetch(`/api/events/${event.slug}/interest`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setInterestedCount(data.interested_count ?? interestedCount)
        setIsInterested(data.is_interested ?? !isInterested)
      }
    } catch (_) {}
    setInterestLoading(false)
  }

  // --- Streaming join/leave tracking ---
  useEffect(() => {
    if (!event.is_live || !event.stream_url) return

    const postStreaming = (action: 'join' | 'leave') => {
      fetch(`/api/admin/events/${event.id}/streaming`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      }).catch(() => {})
    }

    postStreaming('join')

    function handleVisibilityChange() {
      if (document.hidden) {
        postStreaming('leave')
      } else {
        postStreaming('join')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      postStreaming('leave')
    }
  }, [event.id, event.is_live, event.stream_url])

  // --- Carpooling state ---
  const [carpoolOpen, setCarpoolOpen] = useState(false)
  const [carpoolData, setCarpoolData] = useState<CarpoolData | null>(null)
  const [carpoolLoading, setCarpoolLoading] = useState(false)
  const [carpoolError, setCarpoolError] = useState<string | null>(null)
  const [showOfferForm, setShowOfferForm] = useState(false)
  const [showRequestForm, setShowRequestForm] = useState(false)

  const [offerSeats, setOfferSeats] = useState('1')
  const [offerArea, setOfferArea] = useState('')
  const [offerTime, setOfferTime] = useState('')
  const [offerNote, setOfferNote] = useState('')
  const [offerSubmitting, setOfferSubmitting] = useState(false)

  const [reqArea, setReqArea] = useState('')
  const [reqNote, setReqNote] = useState('')
  const [reqSubmitting, setReqSubmitting] = useState(false)

  async function openCarpool() {
    if (carpoolOpen) { setCarpoolOpen(false); return }
    setCarpoolOpen(true)
    if (carpoolData) return
    setCarpoolLoading(true)
    setCarpoolError(null)
    try {
      const res = await fetch(`/api/events/${event.slug}/carpool`)
      if (res.ok) {
        const data = await res.json()
        setCarpoolData(data)
      } else {
        setCarpoolError('Could not load carpool info.')
      }
    } catch (_) {
      setCarpoolError('Could not load carpool info.')
    }
    setCarpoolLoading(false)
  }

  async function submitOffer(e: React.FormEvent) {
    e.preventDefault()
    setOfferSubmitting(true)
    try {
      const res = await fetch(`/api/events/${event.slug}/carpool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'offer', seats: Number(offerSeats), from_area: offerArea, time: offerTime, note: offerNote }),
      })
      if (res.ok) {
        const updated = await res.json()
        setCarpoolData(updated)
        setShowOfferForm(false)
        setOfferSeats('1'); setOfferArea(''); setOfferTime(''); setOfferNote('')
      }
    } catch (_) {}
    setOfferSubmitting(false)
  }

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault()
    setReqSubmitting(true)
    try {
      const res = await fetch(`/api/events/${event.slug}/carpool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'request', pickup_area: reqArea, note: reqNote }),
      })
      if (res.ok) {
        const updated = await res.json()
        setCarpoolData(updated)
        setShowRequestForm(false)
        setReqArea(''); setReqNote('')
      }
    } catch (_) {}
    setReqSubmitting(false)
  }

  // Stream embed computed values
  const streamUrl = event.stream_url ?? null
  const streamPlatform = streamUrl ? detectStreamPlatform(streamUrl) : null
  const youtubeVideoId = streamUrl && streamPlatform === 'youtube' ? getYouTubeVideoId(streamUrl) : null
  const twitchChannel = streamUrl && streamPlatform === 'twitch' ? getTwitchChannel(streamUrl) : null

  const inputClass = 'w-full bg-[#0b0e14] border border-[#252b3a] rounded-lg px-3 py-2 text-sm text-[#c9d1e8] placeholder-[#3a3f52] focus:outline-none focus:border-[#38bdf8] transition-colors'
  const labelClass = 'block text-xs text-[#5a6278] mb-1'

  return (
    <div className="min-h-screen bg-[#0b0e14] text-[#c9d1e8]">
      {/* Top bar */}
      <div className="border-b border-[#252b3a] px-6 py-3 flex items-center gap-3">
        <Link href="/" className="text-sm font-bold tracking-widest text-[#f0e6d3]">NODE</Link>
        <span className="text-[#3a3f52]">/</span>
        <Link href="/events" className="text-sm text-[#5a6278] hover:text-[#c9d1e8] transition-colors">Events</Link>
        <span className="text-[#3a3f52]">/</span>
        <span className="text-sm text-[#5a6278] truncate max-w-[200px]">{event.title}</span>
        <div className="ml-auto">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-[#5a6278] hover:text-[#c9d1e8] text-xs">Dashboard</Button>
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div
        className="w-full h-48 md:h-64 bg-[#13161f] relative overflow-hidden"
        style={event.cover_image_url ? { backgroundImage: `url(${event.cover_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
      >
        {!event.cover_image_url && (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1f2c] via-[#13161f] to-[#0b0e14]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e14]/80 to-transparent" />
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Registration result banners */}
        {searchParams?.registration === 'success' && (
          <div className="mb-4 px-4 py-3 rounded-lg border bg-[#9ece6a]/10 border-[#9ece6a]/20 text-sm text-[#9ece6a]">
            You are registered! Check your <a href="/dashboard" className="underline text-[#f0e6d3]">dashboard</a> for details.
          </div>
        )}
        {searchParams?.registration === 'cancelled' && (
          <div className="mb-4 px-4 py-3 rounded-lg border bg-[#e0af68]/10 border-[#e0af68]/20 text-sm text-[#e0af68]">
            Registration cancelled. Your card was not charged.
          </div>
        )}

        {/* Status banners */}
        {(isPast || isCancelled) && (
          <div className={`mb-6 px-4 py-3 rounded-lg border text-sm font-medium ${
            isCancelled
              ? 'bg-[#f7768e]/10 border-[#f7768e]/20 text-[#f7768e]'
              : 'bg-[#252b3a] border-[#2e3548] text-[#5a6278]'
          }`}>
            {isCancelled
              ? event.status === 'postponed' ? 'This event has been postponed.' : 'This event has been cancelled.'
              : 'This event has ended.'}
          </div>
        )}

        {/* Title + meta */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${TYPE_COLORS[event.type] ?? 'bg-gray-500/15 text-gray-400 border-gray-500/20'}`}>
              {TYPE_LABEL[event.type] ?? event.type}
            </span>
            {event.is_live && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border bg-[#f7768e]/15 text-[#f7768e] border-[#f7768e]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f7768e] animate-pulse" />
                LIVE
              </span>
            )}
            {tags.map(tag => (
              <span key={tag!.name} className="text-[10px] px-2 py-0.5 rounded border border-[#252b3a] text-[#5a6278]">
                {tag!.name}
              </span>
            ))}
          </div>
          <h1 className="text-2xl font-bold text-white leading-tight mb-3">{event.title}</h1>
          <ShareButtons
            title={event.title}
            url={`${typeof window !== 'undefined' ? window.location.origin : 'https://nodesudbury.com'}/events/${event.slug}`}
            referralId={userId ?? undefined}
          />
          <div className="flex flex-col gap-1.5 text-sm text-[#5a6278]">
            <div className="flex items-center gap-2">
              <span>
                {fmt(event.starts_at, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                {' · '}
                {fmt(event.starts_at, { hour: '2-digit', minute: '2-digit' })}
                {event.ends_at && ` - ${fmt(event.ends_at, { hour: '2-digit', minute: '2-digit' })} ET`}
              </span>
            </div>
            <div>{locationLine}</div>
            {event.max_capacity && (
              <div>{registered} / {event.max_capacity} registered</div>
            )}
          </div>

          {/* Add to Calendar + I am Interested row */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            {/* Add to Calendar dropdown */}
            <div className="relative" ref={calRef}>
              <button
                onClick={() => setCalOpen(v => !v)}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#252b3a] bg-[#13161f] text-[#8892a4] hover:text-white hover:border-[#38bdf8] transition-colors"
              >
                <span>📅</span>
                <span>Add to Calendar</span>
                <span className="text-[10px] opacity-60">{calOpen ? '▲' : '▼'}</span>
              </button>
              {calOpen && (
                <div className="absolute left-0 top-full mt-1 z-20 min-w-[180px] rounded-lg border border-[#252b3a] bg-[#13161f] shadow-xl overflow-hidden">
                  <a
                    href={gCalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setCalOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs text-[#8892a4] hover:text-white hover:bg-[#1a1f2c] transition-colors"
                  >
                    <span>🗓</span>
                    Google Calendar
                  </a>
                  <a
                    href={icsHref}
                    download={`${event.slug}.ics`}
                    onClick={() => setCalOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs text-[#8892a4] hover:text-white hover:bg-[#1a1f2c] transition-colors border-t border-[#252b3a]"
                  >
                    <span>📁</span>
                    Download .ics
                  </a>
                </div>
              )}
            </div>

            {/* I am Interested */}
            {showInterest && (
              <div className="flex items-center gap-2">
                {userId && (
                  <button
                    onClick={handleInterestToggle}
                    disabled={interestLoading}
                    className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                      isInterested
                        ? 'border-[#f7768e]/40 bg-[#f7768e]/10 text-[#f7768e] hover:bg-[#f7768e]/15'
                        : 'border-[#252b3a] bg-[#13161f] text-[#8892a4] hover:text-[#f7768e] hover:border-[#f7768e]/30'
                    }`}
                  >
                    <span>{isInterested ? '❤️' : '🤍'}</span>
                    <span>{isInterested ? 'Interested' : 'I am Interested'}</span>
                  </button>
                )}
                {interestedCount !== null && interestedCount > 0 && (
                  <span className="text-xs text-[#5a6278]">
                    {interestedCount} {interestedCount === 1 ? 'person' : 'people'} interested
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick links */}
        {(() => {
          const links: { href: string; label: string }[] = []
          if (event.type === 'unconference') links.push({ href: `/events/${event.slug}/unconference`, label: 'Session Board' })
          if (event.type === 'study_group') links.push({ href: `/events/${event.slug}/study-group`, label: 'Study Group Hub' })
          if (event.type === 'game_jam') links.push({ href: `/events/${event.slug}/game-jam`, label: 'Game Jam' })
          if (event.type === 'job_fair') links.push({ href: `/events/${event.slug}/job-fair`, label: 'Job Fair Booths' })
          if (event.type === 'async_event') links.push({ href: `/events/${event.slug}/async`, label: 'Async Portal' })
          if (event.type === 'demo_day') links.push({ href: `/events/${event.slug}/demos`, label: 'Demo Board' })
          if (event.type === 'hackathon') {
            links.push({ href: `/hackathon/${event.id}`, label: 'Hackathon Portal' })
            links.push({ href: `/hackathon/${event.id}/ctf/scoreboard`, label: 'CTF Scoreboard' })
          }
          if (event.type === 'conference') {
            links.push({ href: `/events/${event.slug}/schedule`, label: 'Schedule' })
            links.push({ href: '/speaker', label: 'Speaker Portal' })
          }
          links.push({ href: `/events/${event.slug}/qa`, label: 'Q&A' })
          return (
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <span className="text-xs text-[#5a6278] mr-1">Quick links</span>
              {links.map(l => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-xs px-3 py-1 rounded-full border border-[#252b3a] text-[#8892a4] hover:text-white hover:border-[#38bdf8] transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          )
        })()}

        <Separator className="mb-6 bg-[#252b3a]" />

        {/* Feature BB - Venue map (physical locations only, full width before grid) */}
        {hasPhysicalLocation && venueMapAddress && (
          <div className="mb-6">
            <VenueMap
              address={venueMapAddress}
              venueName={venueMapName}
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Description + content column */}
          <div className="md:col-span-2 space-y-4">

            {/* Feature AC - Live stream embed */}
            {streamUrl && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-sm font-semibold text-white">Live Stream</h2>
                  {event.is_live && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#f7768e]/15 text-[#f7768e] border border-[#f7768e]/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f7768e] animate-pulse" />
                      LIVE NOW
                    </span>
                  )}
                </div>

                {streamPlatform === 'youtube' && youtubeVideoId ? (
                  <div className="w-full" style={{ aspectRatio: '16 / 9' }}>
                    <iframe
                      src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=0`}
                      title="Event live stream"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full rounded-lg border border-[#252b3a]"
                      style={{ display: 'block' }}
                    />
                  </div>
                ) : streamPlatform === 'twitch' && twitchChannel ? (
                  <div className="w-full" style={{ aspectRatio: '16 / 9' }}>
                    <iframe
                      src={`https://player.twitch.tv/?channel=${twitchChannel}&parent=nodesudbury.com`}
                      title="Event live stream"
                      allowFullScreen
                      className="w-full h-full rounded-lg border border-[#252b3a]"
                      style={{ display: 'block' }}
                    />
                  </div>
                ) : (
                  <a
                    href={streamUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#38bdf8]/30 bg-[#38bdf8]/10 text-[#38bdf8] text-sm font-medium hover:bg-[#38bdf8]/15 transition-colors"
                  >
                    <span>Watch Live</span>
                    <span className="text-xs opacity-70">↗</span>
                  </a>
                )}
              </div>
            )}

            {event.description && (
              <div>
                <h2 className="text-sm font-semibold text-white mb-2">About this event</h2>
                <p className="text-sm text-[#8892a4] leading-relaxed whitespace-pre-wrap">{event.description}</p>
              </div>
            )}

            {/* Feature AR - Carpooling accordion (all events with a physical location) */}
            {hasPhysicalLocation && (
              <div className="rounded-lg border border-[#252b3a] overflow-hidden">
                <button
                  onClick={openCarpool}
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#13161f] hover:bg-[#1a1f2c] transition-colors text-left"
                  aria-expanded={carpoolOpen}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">Carpooling</span>
                    <span className="text-xs text-[#5a6278]">Share a ride to this event</span>
                  </div>
                  <span className="text-[#5a6278] text-sm transition-transform" style={{ transform: carpoolOpen ? 'rotate(180deg)' : 'none' }}>
                    ▼
                  </span>
                </button>

                {carpoolOpen && (
                  <div className="px-4 py-4 bg-[#0f1117] border-t border-[#252b3a] space-y-5">
                    {carpoolLoading && (
                      <p className="text-xs text-[#5a6278]">Loading carpool info...</p>
                    )}
                    {carpoolError && (
                      <p className="text-xs text-[#f7768e]">{carpoolError}</p>
                    )}

                    {carpoolData && (
                      <>
                        {/* Offers list */}
                        <div>
                          <h3 className="text-xs font-semibold text-[#c9d1e8] mb-2">Seats offered</h3>
                          {carpoolData.offers.length === 0 ? (
                            <p className="text-xs text-[#5a6278]">No one has offered a seat yet. Be the first!</p>
                          ) : (
                            <div className="space-y-2">
                              {carpoolData.offers.map(offer => (
                                <div key={offer.id} className="flex items-start gap-2 text-xs">
                                  <span className="text-[#9ece6a] font-medium shrink-0">{offer.user_name}</span>
                                  <span className="text-[#5a6278]">
                                    offers {offer.seats} {offer.seats === 1 ? 'seat' : 'seats'} from {offer.from_area} at {offer.time}
                                    {offer.note ? ` - ${offer.note}` : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Requests list */}
                        <div>
                          <h3 className="text-xs font-semibold text-[#c9d1e8] mb-2">Ride requests</h3>
                          {carpoolData.requests.length === 0 ? (
                            <p className="text-xs text-[#5a6278]">No ride requests yet.</p>
                          ) : (
                            <div className="space-y-2">
                              {carpoolData.requests.map(req => (
                                <div key={req.id} className="flex items-start gap-2 text-xs">
                                  <span className="text-[#7aa2f7] font-medium shrink-0">{req.user_name}</span>
                                  <span className="text-[#5a6278]">
                                    needs a ride from {req.pickup_area}
                                    {req.note ? ` - ${req.note}` : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={() => { setShowOfferForm(v => !v); setShowRequestForm(false) }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-[#9ece6a]/30 bg-[#9ece6a]/10 text-[#9ece6a] hover:bg-[#9ece6a]/15 transition-colors font-medium"
                      >
                        {showOfferForm ? 'Cancel' : 'Offer a seat'}
                      </button>
                      <button
                        onClick={() => { setShowRequestForm(v => !v); setShowOfferForm(false) }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-[#7aa2f7]/30 bg-[#7aa2f7]/10 text-[#7aa2f7] hover:bg-[#7aa2f7]/15 transition-colors font-medium"
                      >
                        {showRequestForm ? 'Cancel' : 'Request a ride'}
                      </button>
                    </div>

                    {/* Offer form */}
                    {showOfferForm && (
                      <form onSubmit={submitOffer} className="space-y-3 pt-2 border-t border-[#252b3a]">
                        <p className="text-xs font-semibold text-[#9ece6a]">Offer a seat</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={labelClass}>Number of seats</label>
                            <input
                              type="number"
                              min="1"
                              max="8"
                              required
                              value={offerSeats}
                              onChange={e => setOfferSeats(e.target.value)}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Departure time</label>
                            <input
                              type="text"
                              placeholder="e.g. 5:00 PM"
                              required
                              value={offerTime}
                              onChange={e => setOfferTime(e.target.value)}
                              className={inputClass}
                            />
                          </div>
                        </div>
                        <div>
                          <label className={labelClass}>Departure area</label>
                          <input
                            type="text"
                            placeholder="e.g. New Sudbury, Lively"
                            required
                            value={offerArea}
                            onChange={e => setOfferArea(e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Note (optional)</label>
                          <input
                            type="text"
                            placeholder="Any extra details"
                            value={offerNote}
                            onChange={e => setOfferNote(e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={offerSubmitting}
                          className="text-xs px-4 py-2 rounded-lg bg-[#9ece6a] text-[#0b0e14] font-semibold hover:bg-[#a8d878] transition-colors disabled:opacity-50"
                        >
                          {offerSubmitting ? 'Submitting...' : 'Post offer'}
                        </button>
                      </form>
                    )}

                    {/* Request form */}
                    {showRequestForm && (
                      <form onSubmit={submitRequest} className="space-y-3 pt-2 border-t border-[#252b3a]">
                        <p className="text-xs font-semibold text-[#7aa2f7]">Request a ride</p>
                        <div>
                          <label className={labelClass}>Pickup area</label>
                          <input
                            type="text"
                            placeholder="e.g. Minnow Lake area, downtown"
                            required
                            value={reqArea}
                            onChange={e => setReqArea(e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Note (optional)</label>
                          <input
                            type="text"
                            placeholder="Any extra details"
                            value={reqNote}
                            onChange={e => setReqNote(e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={reqSubmitting}
                          className="text-xs px-4 py-2 rounded-lg bg-[#7aa2f7] text-[#0b0e14] font-semibold hover:bg-[#8bb4ff] transition-colors disabled:opacity-50"
                        >
                          {reqSubmitting ? 'Submitting...' : 'Post request'}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}

            {event.event_sessions.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-white">Schedule</h2>
                  {(event.type === 'conference' || event.type === 'multi_track') && (
                    <Link href={`/events/${event.slug}/schedule`} className="text-xs text-[#38bdf8] hover:underline">
                      Full schedule
                    </Link>
                  )}
                </div>
                {(event.type === 'conference' || event.type === 'multi_track') ? (
                  <Link
                    href={`/events/${event.slug}/schedule`}
                    className="block w-full text-center py-3 rounded-lg border border-[#38bdf8]/30 bg-[#38bdf8]/10 text-[#38bdf8] text-sm font-medium hover:bg-[#38bdf8]/15 transition-colors"
                  >
                    View Full Schedule ({event.event_sessions.length} sessions)
                  </Link>
                ) : (
                  <div className="space-y-2">
                    {event.event_sessions.map(s => (
                      <div key={s.id} className="flex items-start gap-3 text-xs">
                        <span className="text-[#5a6278] shrink-0 w-16 tabular-nums">
                          {fmt(s.starts_at, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div>
                          <p className="text-[#c9d1e8]">{s.title}</p>
                          {s.room && <p className="text-[#5a6278]">{s.room}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          {(hasPostEventLinks || event.status === 'archived') && (
              <div>
                <h2 className="text-sm font-semibold text-white mb-3">Post-Event</h2>
                <div className="space-y-2">
                  {event.recording_url && (
                    <a href={event.recording_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-[#7aa2f7] hover:text-[#c9d1e8] transition-colors">
                      <span>Watch the Recording</span>
                    </a>
                  )}
                  {event.photos_url && (
                    <a href={event.photos_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-[#7aa2f7] hover:text-[#c9d1e8] transition-colors">
                      <span>View Photos</span>
                    </a>
                  )}
                  {event.recap_url && (
                    <a href={event.recap_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-[#7aa2f7] hover:text-[#c9d1e8] transition-colors">
                      <span>Read the Recap</span>
                    </a>
                  )}
                  {event.status === 'archived' && (
                    <Link href={`/events/${event.slug}/feedback`}
                      className="flex items-center gap-2 text-xs text-[#9ece6a] hover:text-[#c9d1e8] transition-colors">
                      <span>Leave Feedback</span>
                    </Link>
                  )}
                </div>
              </div>
            )}
          {speakers.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-white mb-3">Speakers</h2>
                <div className="space-y-3">
                  {speakers.map(s => (
                    <div key={s.id} className="flex items-start gap-3 p-3 rounded-lg bg-[#13161f] border border-[#252b3a]">
                      <div className="w-10 h-10 rounded-full bg-[#1a1f2c] border border-[#252b3a] flex items-center justify-center text-sm font-bold text-[#38bdf8] shrink-0 overflow-hidden">
                        {s.photo_url ? <img src={s.photo_url} alt={s.name} className="w-10 h-10 object-cover" /> : s.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{s.name}</p>
                        {(s.title || s.company) && <p className="text-xs text-[#5a6278]">{[s.title, s.company].filter(Boolean).join(' · ')}</p>}
                        {s.talk_title && <p className="text-xs text-[#38bdf8] mt-0.5">{s.talk_title}</p>}
                        <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-[#252b3a] text-[#5a6278] capitalize">{s.session_type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {mentors.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-white mb-3">Mentors</h2>
                <div className="space-y-3">
                  {mentors.map(m => (
                    <div key={m.id} className="flex items-start gap-3 p-3 rounded-lg bg-[#13161f] border border-[#252b3a]">
                      <div className="w-10 h-10 rounded-full bg-[#1a1f2c] border border-[#252b3a] flex items-center justify-center text-sm font-bold text-[#9ece6a] shrink-0 overflow-hidden">
                        {m.avatar_url ? <img src={m.avatar_url} alt={m.name} className="w-10 h-10 object-cover" /> : m.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{m.name}</p>
                        {(m.title || m.company) && <p className="text-xs text-[#5a6278]">{[m.title, m.company].filter(Boolean).join(' · ')}</p>}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {m.expertise_tags.map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-[#9ece6a]/10 text-[#9ece6a] border border-[#9ece6a]/20">{t}</span>)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {searchboards.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-white mb-3">Whiteboards</h2>
                <div className="space-y-2">
                  {searchboards.map(wb => (
                    <a
                      key={wb.id}
                      href={`/whiteboard/${wb.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-[#7aa2f7] hover:text-[#c9d1e8] transition-colors"
                    >
                      <span className="w-2 h-2 rounded-full bg-[#7aa2f7]/50 shrink-0" />
                      {wb.title}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {event.type === 'unconference' && (
              <div className="p-4 rounded-lg bg-[#13161f] border border-[#252b3a]">
                <h2 className="text-sm font-semibold text-white mb-1">Session Board</h2>
                <p className="text-xs text-[#5a6278] mb-3">Propose sessions, vote with dots, and see the schedule.</p>
                <Link href={`/events/${event.slug}/unconference`} className="inline-flex items-center text-xs text-[#38bdf8] hover:underline font-medium">
                  Open Session Board →
                </Link>
              </div>
            )}

            {event.type === 'study_group' && (
              <div className="p-4 rounded-lg bg-[#13161f] border border-[#252b3a]">
                <h2 className="text-sm font-semibold text-white mb-1">Study Group</h2>
                <p className="text-xs text-[#5a6278] mb-3">Join a cohort and track your progress through the curriculum.</p>
                <Link href={`/events/${event.slug}/study-group`} className="inline-flex items-center text-xs text-[#38bdf8] hover:underline font-medium">
                  View Cohorts →
                </Link>
              </div>
            )}

            {event.type === 'demo_day' && (
              <div className="p-4 rounded-lg bg-[#13161f] border border-[#252b3a]">
                <h2 className="text-sm font-semibold text-white mb-1">Demo Showcase</h2>
                <p className="text-xs text-[#5a6278] mb-3">See who is demoing and vote for your favourite projects.</p>
                <Link href={`/events/${event.slug}/demos`} className="inline-flex items-center text-xs text-[#38bdf8] hover:underline font-medium">
                  View Demos →
                </Link>
              </div>
            )}

            {event.type === 'job_fair' && (
              <div className="p-4 rounded-lg bg-[#13161f] border border-[#252b3a]">
                <h2 className="text-sm font-semibold text-white mb-1">Job Fair</h2>
                <p className="text-xs text-[#5a6278] mb-3">Browse employers, explore job listings, and book 1:1 meetings.</p>
                <Link href={`/events/${event.slug}/job-fair`} className="inline-flex items-center text-xs text-[#38bdf8] hover:underline font-medium">
                  Browse Employers →
                </Link>
              </div>
            )}

            {event.type === 'async_event' && (
              <div className="p-4 rounded-lg bg-[#13161f] border border-[#252b3a]">
                <h2 className="text-sm font-semibold text-white mb-1">Async Challenge</h2>
                <p className="text-xs text-[#5a6278] mb-3">Submit your work at your own pace before the deadline.</p>
                <Link href={`/events/${event.slug}/async`} className="inline-flex items-center text-xs text-[#38bdf8] hover:underline font-medium">
                  View Challenges →
                </Link>
              </div>
            )}

            {event.type === 'hackathon' && (
              <div className="rounded-lg bg-[#13161f] border border-[#252b3a] overflow-hidden">
                <div className="px-4 py-3 border-b border-[#252b3a] bg-[#0f1219]">
                  <h2 className="text-sm font-semibold text-white">Hackathon Hub</h2>
                  <p className="text-xs text-[#5a6278] mt-0.5">Everything you need to compete.</p>
                </div>
                <div className="divide-y divide-[#1e2235]">
                  <Link href={`/hackathon/${event.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-[#1a1f2c] transition-colors group">
                    <div>
                      <p className="text-sm font-medium text-[#c9d1e8] group-hover:text-white transition-colors">Team Registration</p>
                      <p className="text-xs text-[#5a6278] mt-0.5">Create or join a team to participate</p>
                    </div>
                    <span className="text-[#5a6278] group-hover:text-[#38bdf8] text-sm transition-colors">→</span>
                  </Link>
                  <Link href={`/hackathon/${event.id}/submit`} className="flex items-center justify-between px-4 py-3 hover:bg-[#1a1f2c] transition-colors group">
                    <div>
                      <p className="text-sm font-medium text-[#c9d1e8] group-hover:text-white transition-colors">Submit Project</p>
                      <p className="text-xs text-[#5a6278] mt-0.5">Upload your project demo and deck</p>
                    </div>
                    <span className="text-[#5a6278] group-hover:text-[#38bdf8] text-sm transition-colors">→</span>
                  </Link>
                  <Link href={`/hackathon/${event.id}/bracket`} className="flex items-center justify-between px-4 py-3 hover:bg-[#1a1f2c] transition-colors group">
                    <div>
                      <p className="text-sm font-medium text-[#c9d1e8] group-hover:text-white transition-colors">Bracket</p>
                      <p className="text-xs text-[#5a6278] mt-0.5">Track rounds and matchups live</p>
                    </div>
                    <span className="text-[#5a6278] group-hover:text-[#38bdf8] text-sm transition-colors">→</span>
                  </Link>
                  <Link href={`/hackathon/${event.id}/results`} className="flex items-center justify-between px-4 py-3 hover:bg-[#1a1f2c] transition-colors group">
                    <div>
                      <p className="text-sm font-medium text-[#c9d1e8] group-hover:text-white transition-colors">Leaderboard</p>
                      <p className="text-xs text-[#5a6278] mt-0.5">Scores and rankings by round</p>
                    </div>
                    <span className="text-[#5a6278] group-hover:text-[#38bdf8] text-sm transition-colors">→</span>
                  </Link>
                  <Link href={`/hackathon/${event.id}/awards`} className="flex items-center justify-between px-4 py-3 hover:bg-[#1a1f2c] transition-colors group">
                    <div>
                      <p className="text-sm font-medium text-[#c9d1e8] group-hover:text-white transition-colors">Awards</p>
                      <p className="text-xs text-[#5a6278] mt-0.5">Winners, prizes, and recognitions</p>
                    </div>
                    <span className="text-[#5a6278] group-hover:text-[#38bdf8] text-sm transition-colors">→</span>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Tickets sidebar */}
          <div className="space-y-3">
            {activeHunt && (
              <Link href={`/hunt/${activeHunt.id}`} className="block px-4 py-3 rounded-lg bg-[#7aa2f7]/10 border border-[#7aa2f7]/20 hover:bg-[#7aa2f7]/15 transition-colors">
                <p className="text-xs font-semibold text-[#7aa2f7] mb-0.5">Scavenger Hunt</p>
                <p className="text-xs text-[#5a6278]">{activeHunt.title} - collect stamps to earn points</p>
              </Link>
            )}

            {/* Ticket tier selection */}
            {activeTiers.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-white">Select a Ticket Tier</h2>
                <div className="space-y-2">
                  {activeTiers.map(tier => {
                    const isSelected = selectedTierId === tier.id
                    return (
                      <label
                        key={tier.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-[#38bdf8] bg-[#38bdf8]/8'
                            : 'border-[#252b3a] bg-[#13161f] hover:border-[#38bdf8]/40'
                        }`}
                      >
                        <input
                          type="radio"
                          name="ticket_tier"
                          value={tier.id}
                          checked={isSelected}
                          onChange={() => setSelectedTierId(tier.id)}
                          className="mt-0.5 accent-[#38bdf8] shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-white">{tier.name}</span>
                            {tier.price_cents === 0 ? (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#9ece6a]/15 text-[#9ece6a] border border-[#9ece6a]/30">
                                Free
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-[#38bdf8]">
                                {formatTierPrice(tier.price_cents)}
                              </span>
                            )}
                          </div>
                          {tier.description && (
                            <p className="text-xs text-[#8892a4] mt-0.5 leading-relaxed">{tier.description}</p>
                          )}
                          {tier.capacity !== null && (
                            <p className="text-[10px] text-[#5a6278] mt-0.5">
                              {tier.capacity} spots available
                            </p>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            <h2 className="text-sm font-semibold text-white">Tickets</h2>
            {event.ticket_types.filter(t => t.is_active).length === 0 ? (
              <p className="text-xs text-[#5a6278]">Registration not yet open.</p>
            ) : (
              event.ticket_types.filter(t => t.is_active).map(t => {
                const sold = t.quantity_sold ?? 0
                const avail = t.quantity_available ? t.quantity_available - sold : null
                const soldOut = avail !== null && avail <= 0
                return (
                  <Card key={t.id} className="bg-[#13161f] border-[#252b3a]">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-medium text-white">{t.name}</p>
                        <span className="text-xs font-semibold text-[#9ece6a] shrink-0">{formatTicketPrice(t)}</span>
                      </div>
                      {t.description && <p className="text-xs text-[#5a6278] mb-3 leading-relaxed">{t.description}</p>}
                      {avail !== null && avail < 10 && avail > 0 && (
                        <p className="text-[10px] text-[#e0af68] mb-2">{avail} spots left</p>
                      )}
                      <Button
                        size="sm"
                        disabled={isPast || isCancelled || soldOut}
                        onClick={() => !isPast && !isCancelled && !soldOut && setModalOpen(true)}
                        className="w-full text-xs h-8 bg-[#f0e6d3] text-[#0b0e14] hover:bg-[#e8ddc8] font-medium disabled:opacity-40"
                      >
                        {soldOut ? 'Sold out' : isPast ? 'Event ended' : isCancelled ? 'Cancelled' : 'Register'}
                      </Button>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </div>
      </div>

      <RegisterModal
        event={{ id: event.id, title: event.title, slug: event.slug, starts_at: event.starts_at, max_capacity: event.max_capacity }}
        ticketTypes={event.ticket_types.map(t => ({ ...t, quantity_sold: t.quantity_sold ?? 0 }))}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        selectedTierId={selectedTierId ?? undefined}
      />
    </div>
  )
}

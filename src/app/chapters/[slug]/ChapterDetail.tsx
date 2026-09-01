'use client'

import Link from 'next/link'
import { useState } from 'react'

type Chapter = {
  id: string; name: string; city: string; province: string; slug: string
  description: string | null; logo_url: string | null; website_url: string | null
  twitter_handle: string | null; instagram_handle: string | null; created_at: string
}
type Event = {
  id: string; title: string; slug: string; type: string; status: string
  starts_at: string; ends_at: string | null
  location: { name: string; city: string; is_virtual: boolean } | null
}
type BoardMember = {
  role: string
  member: { id: string; display_name: string | null; avatar_url: string | null; bio: string | null } | null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Toronto',
  })
}

const TYPE_COLORS: Record<string, string> = {
  meetup: 'bg-blue-500/15 text-blue-400', workshop: 'bg-purple-500/15 text-purple-400',
  hackathon: 'bg-amber-500/15 text-amber-400', conference: 'bg-teal-500/15 text-teal-400',
}
const TYPE_LABEL: Record<string, string> = {
  meetup: 'Meetup', workshop: 'Workshop', hackathon: 'Hackathon', conference: 'Conference',
}

export default function ChapterDetail({
  chapter, events, boardMembers, memberCount, eventCount,
}: {
  chapter: Chapter; events: Event[]; boardMembers: BoardMember[]
  memberCount: number; eventCount: number
}) {
  const [tab, setTab] = useState<'events' | 'team'>('events')
  const founded = new Date(chapter.created_at).getFullYear()

  return (
    <div className="min-h-screen bg-[#0b0e14] text-[#c9d1e8]">
      <div className="border-b border-[#252b3a] px-6 py-3 flex items-center gap-3">
        <Link href="/" className="text-sm font-bold tracking-widest text-[#f0e6d3]">NODE</Link>
        <span className="text-[#3a3f52]">/</span>
        <Link href="/chapters" className="text-sm text-[#5a6278] hover:text-[#c9d1e8]">Chapters</Link>
        <span className="text-[#3a3f52]">/</span>
        <span className="text-sm text-[#5a6278]">{chapter.name}</span>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-start gap-6 mb-8">
          {chapter.logo_url ? (
            <img src={chapter.logo_url} alt={chapter.name} className="w-16 h-16 rounded-xl object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-[#1e2330] flex items-center justify-center text-2xl font-bold text-[#f0e6d3]">
              {chapter.name[0]}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-white">{chapter.name}</h1>
            <p className="text-sm text-[#5a6278] mt-1">{chapter.city}, {chapter.province}</p>
            {chapter.description && (
              <p className="text-sm text-[#7a8398] mt-3 max-w-xl">{chapter.description}</p>
            )}
            <div className="flex items-center gap-4 mt-4">
              {chapter.website_url && (
                <a href={chapter.website_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-[#5a6278] hover:text-[#f0e6d3] transition-colors">
                  Website
                </a>
              )}
              {chapter.twitter_handle && (
                <a href={`https://twitter.com/${chapter.twitter_handle}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-[#5a6278] hover:text-[#f0e6d3] transition-colors">
                  @{chapter.twitter_handle}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Members', value: memberCount },
            { label: 'Events held', value: eventCount },
            { label: 'Founded', value: founded },
          ].map(s => (
            <div key={s.label} className="bg-[#13161e] border border-[#252b3a] rounded-lg p-4 text-center">
              <div className="text-xl font-semibold text-white">{s.value}</div>
              <div className="text-xs text-[#5a6278] mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[#13161e] border border-[#252b3a] rounded-lg p-1 w-fit">
          {(['events', 'team'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors capitalize ${
                tab === t ? 'bg-[#f0e6d3] text-[#0b0e14]' : 'text-[#5a6278] hover:text-[#c9d1e8]'
              }`}>
              {t === 'events' ? 'Upcoming Events' : 'Team'}
            </button>
          ))}
        </div>

        {tab === 'events' && (
          <div className="space-y-3">
            {events.length === 0 ? (
              <p className="text-sm text-[#5a6278] py-8 text-center">No upcoming events.</p>
            ) : events.map(event => (
              <Link key={event.id} href={`/events/${event.slug}`}
                className="flex items-center gap-4 bg-[#13161e] border border-[#252b3a] rounded-lg px-5 py-4 hover:border-[#f0e6d3]/30 transition-colors group">
                <div className="w-12 text-center flex-shrink-0">
                  <div className="text-xs text-[#5a6278]">
                    {new Date(event.starts_at).toLocaleDateString('en-CA', { month: 'short', timeZone: 'America/Toronto' })}
                  </div>
                  <div className="text-lg font-bold text-white">
                    {new Date(event.starts_at).getDate()}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white group-hover:text-[#f0e6d3] transition-colors truncate">
                    {event.title}
                  </div>
                  <div className="text-xs text-[#5a6278] mt-0.5">
                    {event.location ? (event.location.is_virtual ? 'Online' : event.location.name) : ''}
                    {' · '}{formatDate(event.starts_at)}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[event.type] ?? 'bg-gray-500/15 text-gray-400'}`}>
                  {TYPE_LABEL[event.type] ?? event.type}
                </span>
              </Link>
            ))}
          </div>
        )}

        {tab === 'team' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {boardMembers.length === 0 ? (
              <p className="text-sm text-[#5a6278] py-8">No team members listed.</p>
            ) : boardMembers.map((bm, i) => bm.member && (
              <div key={i} className="flex items-start gap-3 bg-[#13161e] border border-[#252b3a] rounded-lg p-4">
                <div className="w-10 h-10 rounded-full bg-[#1e2330] flex items-center justify-center text-sm font-bold text-[#f0e6d3] flex-shrink-0 overflow-hidden">
                  {bm.member.avatar_url
                    ? <img src={bm.member.avatar_url} alt="" className="w-full h-full object-cover" />
                    : (bm.member.display_name?.[0] ?? '?')}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{bm.member.display_name ?? 'Member'}</div>
                  <div className="text-xs text-[#5a6278] capitalize">{bm.role}</div>
                  {bm.member.bio && <p className="text-xs text-[#7a8398] mt-1 line-clamp-2">{bm.member.bio}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

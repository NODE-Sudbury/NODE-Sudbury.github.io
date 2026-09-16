'use client'

import { useState } from 'react'
import Link from 'next/link'

type SpeakerEntry = {
  key: string; name: string; title: string | null; company: string | null
  bio: string | null; photo_url: string | null; member_id: string | null
  talks: { event_title: string; event_slug: string; talk_title: string | null; session_type: string }[]
}

export default function SpeakersDirectory({ speakers }: { speakers: SpeakerEntry[] }) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = speakers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.company?.toLowerCase().includes(search.toLowerCase()) ||
    s.title?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#0b0e14] text-[#c9d1e8]">
      <div className="border-b border-[#252b3a] px-6 py-3 flex items-center gap-3">
        <Link href="/" className="text-sm font-bold tracking-widest text-[#f0e6d3]">NODE</Link>
        <span className="text-[#3a3f52]">/</span>
        <span className="text-sm text-[#5a6278]">Speakers</span>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">Community Speakers</h1>
          <p className="text-sm text-[#5a6278]">{speakers.length} members who have presented at NODE Sudbury events</p>
        </div>

        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, title, or company..."
          className="w-full mb-8 px-4 py-2.5 rounded-xl bg-[#13161f] border border-[#252b3a] text-sm text-white placeholder-[#5a6278] focus:outline-none focus:border-[#38bdf8]"
        />

        {filtered.length === 0 && (
          <p className="text-sm text-[#5a6278]">No speakers found{search ? ` for "${search}"` : ''}.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map(s => (
            <div key={s.key} className="rounded-xl bg-[#13161f] border border-[#252b3a] overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === s.key ? null : s.key)}
                className="w-full text-left p-4 flex items-start gap-3 hover:bg-[#1a1f2c] transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-[#1a1f2c] border border-[#252b3a] flex items-center justify-center text-lg font-bold text-[#38bdf8] shrink-0 overflow-hidden">
                  {s.photo_url
                    ? <img src={s.photo_url} alt={s.name} className="w-12 h-12 object-cover" />
                    : s.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white leading-tight">{s.name}</p>
                  {(s.title || s.company) && (
                    <p className="text-xs text-[#5a6278] mt-0.5">{[s.title, s.company].filter(Boolean).join(' · ')}</p>
                  )}
                  <p className="text-xs text-[#38bdf8] mt-1">{s.talks.length} {s.talks.length === 1 ? 'talk' : 'talks'}</p>
                </div>
                <span className="text-[#5a6278] text-xs mt-1">{expanded === s.key ? '▲' : '▼'}</span>
              </button>

              {expanded === s.key && (
                <div className="px-4 pb-4 border-t border-[#252b3a]">
                  {s.bio && <p className="text-xs text-[#8892a4] leading-relaxed mt-3 mb-3">{s.bio}</p>}
                  <div className="space-y-2">
                    {s.talks.map((t, i) => (
                      <Link key={i} href={`/events/${t.event_slug}`} className="flex items-start gap-2 text-xs group hover:text-white transition-colors">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]/50 shrink-0 mt-1.5" />
                        <div>
                          <span className="text-[#38bdf8] group-hover:text-white transition-colors">{t.event_title}</span>
                          {t.talk_title && <span className="text-[#5a6278]"> - {t.talk_title}</span>}
                          <span className="ml-2 inline-block text-[9px] px-1.5 py-0.5 rounded bg-[#252b3a] text-[#5a6278] capitalize">{t.session_type}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

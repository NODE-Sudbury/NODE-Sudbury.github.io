'use client'

import { useEffect, useState } from 'react'

type NpsDist = { score: number; count: number }
type Response = { what_went_well: string | null; what_could_improve: string | null; submitted_at: string }
type Stats = {
  count: number
  avg_nps: number | null
  avg_rating: number | null
  pct_attend_again: number | null
  nps_dist: NpsDist[]
  responses: Response[]
}

const npsColor = (avg: number) =>
  avg <= 6 ? 'text-red-400' : avg <= 8 ? 'text-yellow-400' : 'text-green-400'

export default function FeedbackAdmin({ eventId, eventTitle }: { eventId: string; eventTitle: string }) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/admin/events/${eventId}/feedback`)
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [eventId])

  if (loading) return <p className="text-sm text-[#5a6278] p-8">Loading feedback...</p>
  if (!stats) return <p className="text-sm text-red-400 p-8">Failed to load feedback.</p>

  const maxDist = Math.max(...(stats.nps_dist ?? []).map(d => d.count), 1)

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs text-[#5a6278] mb-1">Event</p>
        <p className="text-lg font-semibold text-white">{eventTitle}</p>
        <p className="text-sm text-[#5a6278]">{stats.count} response{stats.count !== 1 ? 's' : ''}</p>
      </div>

      {stats.count === 0 ? (
        <p className="text-sm text-[#5a6278]">No feedback submitted yet.</p>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#13161f] border border-[#252b3a] rounded-lg p-4">
              <p className="text-xs text-[#5a6278] mb-1">Avg NPS</p>
              <p className={`text-3xl font-bold ${stats.avg_nps !== null ? npsColor(stats.avg_nps) : 'text-[#5a6278]'}`}>
                {stats.avg_nps !== null ? stats.avg_nps : '-'}
              </p>
              {stats.avg_nps !== null && (
                <p className="text-xs text-[#5a6278] mt-1">
                  {stats.avg_nps <= 6 ? 'Detractor' : stats.avg_nps <= 8 ? 'Passive' : 'Promoter'}
                </p>
              )}
            </div>
            <div className="bg-[#13161f] border border-[#252b3a] rounded-lg p-4">
              <p className="text-xs text-[#5a6278] mb-1">Avg Rating</p>
              <p className="text-3xl font-bold text-yellow-400">
                {stats.avg_rating !== null ? stats.avg_rating : '-'}
                {stats.avg_rating !== null && <span className="text-base text-[#5a6278]">/5</span>}
              </p>
              {stats.avg_rating !== null && (
                <p className="text-xs text-yellow-400 mt-1">
                  {'★'.repeat(Math.round(stats.avg_rating))}{'☆'.repeat(5 - Math.round(stats.avg_rating))}
                </p>
              )}
            </div>
            <div className="bg-[#13161f] border border-[#252b3a] rounded-lg p-4">
              <p className="text-xs text-[#5a6278] mb-1">Attend again</p>
              <p className={`text-3xl font-bold ${stats.pct_attend_again !== null && stats.pct_attend_again >= 70 ? 'text-green-400' : 'text-red-400'}`}>
                {stats.pct_attend_again !== null ? `${stats.pct_attend_again}%` : '-'}
              </p>
            </div>
          </div>

          {/* NPS distribution */}
          <div className="bg-[#13161f] border border-[#252b3a] rounded-lg p-4">
            <p className="text-xs font-semibold text-[#5a6278] uppercase tracking-wider mb-4">NPS Distribution</p>
            <div className="flex items-end gap-1 h-24">
              {(stats.nps_dist ?? []).map(d => {
                const pct = (d.count / maxDist) * 100
                const color = d.score <= 6 ? '#f7768e' : d.score <= 8 ? '#e0af68' : '#9ece6a'
                return (
                  <div key={d.score} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      style={{ height: `${pct}%`, background: color, minHeight: d.count > 0 ? 4 : 0, borderRadius: '3px 3px 0 0' }}
                      className="w-full"
                      title={`${d.score}: ${d.count} response${d.count !== 1 ? 's' : ''}`}
                    />
                    <span className="text-[10px] text-[#5a6278]">{d.score}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Text responses */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#5a6278] uppercase tracking-wider">Text Responses</p>
              <a
                href={`/api/admin/events/${eventId}/feedback/export`}
                className="text-xs text-[#7aa2f7] hover:underline"
              >
                Export CSV
              </a>
            </div>
            {(stats.responses ?? []).filter(r => r.what_went_well || r.what_could_improve).map((r, i) => (
              <div key={i} className="bg-[#13161f] border border-[#252b3a] rounded-lg p-4 space-y-2">
                {r.what_went_well && (
                  <div>
                    <p className="text-[10px] font-semibold text-[#9ece6a] uppercase mb-1">What went well</p>
                    <p className="text-sm text-[#c9d1e8]">{r.what_went_well}</p>
                  </div>
                )}
                {r.what_could_improve && (
                  <div>
                    <p className="text-[10px] font-semibold text-[#e0af68] uppercase mb-1">What could improve</p>
                    <p className="text-sm text-[#c9d1e8]">{r.what_could_improve}</p>
                  </div>
                )}
                <p className="text-[10px] text-[#3a3f52]">
                  {new Date(r.submitted_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            ))}
            {stats.responses.filter(r => r.what_went_well || r.what_could_improve).length === 0 && (
              <p className="text-sm text-[#5a6278]">No text responses submitted.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Submission {
  id: string; title: string; talk_type: string; duration_minutes: number
  abstract: string; speaker_bio: string | null; status: string; is_first_time: boolean
  co_speakers: string[] | null; created_at: string
  members?: { full_name: string | null; email: string }
}

interface Props {
  eventId: string
  initialSubmissions: Submission[]
}

const STATUS_COLOR: Record<string, string> = {
  submitted: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  under_review: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  accepted: 'bg-green-500/10 text-green-400 border-green-500/20',
  rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
  withdrawn: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
}

const STATUSES = ['submitted', 'under_review', 'accepted', 'rejected', 'withdrawn']

export default function CFPReview({ eventId, initialSubmissions }: Props) {
  const [submissions, setSubmissions] = useState(initialSubmissions)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  async function updateStatus(id: string, status: string) {
    setUpdating(id)
    const res = await fetch(`/api/admin/cfp/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      const { submission } = await res.json()
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: submission.status } : s))
    }
    setUpdating(null)
  }

  const filtered = filter === 'all' ? submissions : submissions.filter(s => s.status === filter)

  const counts: Record<string, number> = { all: submissions.length }
  STATUSES.forEach(s => { counts[s] = submissions.filter(x => x.status === s).length })

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        {['all', ...STATUSES].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filter === s
                ? 'bg-[#f0e6d3] text-[#0b0e14] border-[#f0e6d3]'
                : 'border-[#252b3a] text-[#5a6278] hover:text-[#c9d1e8]'
            }`}>
            {s.replace('_', ' ')} ({counts[s] ?? 0})
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-[#5a6278] text-sm text-center py-12">No submissions.</p>
      )}

      <div className="space-y-3">
        {filtered.map(sub => (
          <div key={sub.id} className="bg-[#13161f] border border-[#252b3a] rounded-xl overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === sub.id ? null : sub.id)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`text-xs px-2 py-0.5 rounded border font-medium flex-shrink-0 ${STATUS_COLOR[sub.status] ?? ''}`}>
                  {sub.status.replace('_', ' ')}
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-white truncate">{sub.title}</p>
                  <p className="text-xs text-[#5a6278]">
                    {sub.members?.full_name ?? sub.members?.email ?? 'Unknown'} ·
                    {sub.talk_type} · {sub.duration_minutes}min
                    {sub.is_first_time && ' · first-time speaker'}
                  </p>
                </div>
              </div>
              <span className="text-[#5a6278] ml-4">{expanded === sub.id ? '▲' : '▼'}</span>
            </button>

            {expanded === sub.id && (
              <div className="px-4 pb-4 border-t border-[#252b3a] pt-4 space-y-4">
                <div>
                  <p className="text-xs text-[#5a6278] mb-1 uppercase tracking-wide">Abstract</p>
                  <p className="text-sm text-[#c9d1e8] whitespace-pre-wrap">{sub.abstract}</p>
                </div>
                {sub.speaker_bio && (
                  <div>
                    <p className="text-xs text-[#5a6278] mb-1 uppercase tracking-wide">Speaker bio</p>
                    <p className="text-sm text-[#c9d1e8]">{sub.speaker_bio}</p>
                  </div>
                )}
                {sub.co_speakers && sub.co_speakers.length > 0 && (
                  <div>
                    <p className="text-xs text-[#5a6278] mb-1 uppercase tracking-wide">Co-speakers</p>
                    <p className="text-sm text-[#c9d1e8]">{sub.co_speakers.join(', ')}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  {STATUSES.filter(s => s !== sub.status).map(s => (
                    <Button key={s} size="sm" variant="outline" disabled={updating === sub.id}
                      onClick={() => updateStatus(sub.id, s)}
                      className="text-xs capitalize">
                      {updating === sub.id ? '...' : `Mark ${s.replace('_', ' ')}`}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

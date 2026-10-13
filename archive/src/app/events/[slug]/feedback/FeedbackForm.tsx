'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const NPS_COLORS = (n: number) =>
  n <= 6 ? 'border-red-500/40 text-red-400 bg-red-500/10'
  : n <= 8 ? 'border-yellow-500/40 text-yellow-400 bg-yellow-500/10'
  : 'border-green-500/40 text-green-400 bg-green-500/10'

export default function FeedbackForm({ eventId, eventSlug }: { eventId: string; eventSlug: string }) {
  const router = useRouter()
  const [nps, setNps] = useState<number | null>(null)
  const [rating, setRating] = useState<number | null>(null)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [wellText, setWellText] = useState('')
  const [improveText, setImproveText] = useState('')
  const [attendAgain, setAttendAgain] = useState<boolean | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const res = await fetch(`/api/events/${eventSlug}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: eventId,
        nps_score: nps,
        overall_rating: rating,
        what_went_well: wellText || null,
        what_could_improve: improveText || null,
        would_attend_again: attendAgain,
      }),
    })
    setSubmitting(false)
    if (res.ok) {
      setSuccess(true)
      setTimeout(() => router.refresh(), 2000)
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Failed to submit feedback.')
    }
  }

  if (success) {
    return (
      <div className="text-center space-y-4 py-12">
        <div className="text-5xl animate-bounce">
          {'🎉 ✨ 🙌'.split(' ').map((e, i) => (
            <span key={i} style={{ animationDelay: `${i * 0.15}s`, display: 'inline-block', margin: '0 4px' }}>{e}</span>
          ))}
        </div>
        <p className="text-xl font-bold text-white">Thank you for your feedback!</p>
        <p className="text-sm text-[#5a6278]">Your response helps us improve future NODE events.</p>
      </div>
    )
  }

  const textareaCls = 'w-full bg-[#0b0e14] border border-[#252b3a] rounded-md px-3 py-2 text-sm text-[#c9d1e8] resize-none focus:outline-none focus:ring-1 focus:ring-[#f0e6d3]/40 placeholder:text-[#3a3f52]'

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* NPS */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-white">How likely are you to recommend NODE events to a colleague?</p>
        <p className="text-xs text-[#5a6278]">0 = not at all likely, 10 = extremely likely</p>
        <div className="flex gap-1 flex-wrap">
          {Array.from({ length: 11 }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setNps(i)}
              className={`w-9 h-9 rounded text-xs font-semibold border transition-all ${
                nps === i
                  ? NPS_COLORS(i)
                  : 'border-[#252b3a] text-[#5a6278] hover:border-[#5a6278] hover:text-[#c9d1e8]'
              }`}
            >
              {i}
            </button>
          ))}
        </div>
        {nps !== null && (
          <p className="text-xs text-[#5a6278]">
            {nps <= 6 ? 'Detractor' : nps <= 8 ? 'Passive' : 'Promoter'}
          </p>
        )}
      </div>

      {/* Overall rating */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-white">Overall rating</p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(n => {
            const filled = n <= (hoverRating ?? rating ?? 0)
            return (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(null)}
                className={`text-2xl transition-all ${filled ? 'text-yellow-400' : 'text-[#252b3a]'} hover:scale-110`}
              >
                {filled ? '★' : '☆'}
              </button>
            )
          })}
        </div>
      </div>

      {/* What went well */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-white block">What went well?</label>
        <textarea
          rows={3}
          value={wellText}
          onChange={e => setWellText(e.target.value)}
          className={textareaCls}
          placeholder="The speakers were great, the venue was easy to find..."
        />
      </div>

      {/* What could improve */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-white block">What could be improved?</label>
        <textarea
          rows={3}
          value={improveText}
          onChange={e => setImproveText(e.target.value)}
          className={textareaCls}
          placeholder="More networking time, earlier start time..."
        />
      </div>

      {/* Would attend again */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-white">Would you attend another NODE event?</p>
        <div className="flex gap-2">
          {(['Yes', 'No'] as const).map(val => {
            const boolVal = val === 'Yes'
            const selected = attendAgain === boolVal
            return (
              <button
                key={val}
                type="button"
                onClick={() => setAttendAgain(boolVal)}
                className={`px-5 py-2 rounded text-sm font-medium border transition-all ${
                  selected
                    ? val === 'Yes'
                      ? 'border-green-500/50 text-green-400 bg-green-500/10'
                      : 'border-red-500/50 text-red-400 bg-red-500/10'
                    : 'border-[#252b3a] text-[#5a6278] hover:border-[#5a6278]'
                }`}
              >
                {val}
              </button>
            )
          })}
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 rounded-lg bg-[#f0e6d3] text-[#0b0e14] font-semibold text-sm hover:bg-[#e8dcc8] transition-colors disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Submit Feedback'}
      </button>
    </form>
  )
}

'use client'

import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'

interface Option {
  id: string; option_text: string; vote_count: number; sort_order: number
}

interface Poll {
  id: string; question: string; status: string; allows_multiple: boolean
}

interface Props {
  poll: Poll
  initialOptions: Option[]
  userId: string | null
  eventTitle: string
}

export default function PollClient({ poll, initialOptions, userId, eventTitle }: Props) {
  const [options, setOptions] = useState(initialOptions)
  const [voted, setVoted] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const channel = supabase
      .channel(`poll:${poll.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'poll_options', filter: `poll_id=eq.${poll.id}` },
        ({ new: opt }) => setOptions(prev => prev.map(o => o.id === (opt as Option).id ? opt as Option : o))
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [poll.id])

  async function handleVote(optionId: string) {
    if (!userId || voted || poll.status !== 'active') return
    setSubmitting(true)
    setError('')
    const res = await fetch('/api/poll/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poll_id: poll.id, option_id: optionId }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Vote failed'); setSubmitting(false); return }
    setVoted(optionId)
    if (data.results) setOptions(data.results)
    setSubmitting(false)
  }

  const total = options.reduce((s, o) => s + (o.vote_count ?? 0), 0)
  const canVote = !!userId && !voted && poll.status === 'active'
  const showResults = voted || poll.status === 'closed'

  return (
    <div className="min-h-screen bg-[#0b0e14] py-10 px-4">
      <div className="max-w-xl mx-auto">
        <p className="text-[#5a6278] text-sm mb-1">{eventTitle}</p>
        <h1 className="text-xl font-semibold text-white mb-6">{poll.question}</h1>

        {poll.status === 'draft' && (
          <p className="text-[#5a6278] text-sm text-center py-8">This poll is not open yet.</p>
        )}

        {(poll.status === 'active' || poll.status === 'closed') && (
          <div className="space-y-3">
            {[...options].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map(opt => {
              const pct = total > 0 ? Math.round((opt.vote_count / total) * 100) : 0
              return (
                <button key={opt.id}
                  onClick={() => handleVote(opt.id)}
                  disabled={!canVote || submitting}
                  className={`w-full relative rounded-xl border text-left overflow-hidden transition-colors ${
                    voted === opt.id
                      ? 'border-[#f0e6d3]/50'
                      : 'border-[#252b3a] hover:border-[#f0e6d3]/20'
                  } ${!canVote ? 'cursor-default' : 'cursor-pointer'} bg-[#13161f]`}
                >
                  {showResults && (
                    <div
                      className="absolute inset-y-0 left-0 bg-[#f0e6d3]/10 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  )}
                  <div className="relative flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-white">{opt.option_text}</span>
                    {showResults && (
                      <span className="text-xs text-[#5a6278] ml-2 flex-shrink-0">
                        {pct}% ({opt.vote_count})
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {error && <p className="text-sm text-red-400 mt-3">{error}</p>}

        {!userId && poll.status === 'active' && (
          <p className="text-[#5a6278] text-sm text-center mt-6">
            <a href="/login" className="text-[#f0e6d3] underline">Sign in</a> to vote.
          </p>
        )}

        {total > 0 && showResults && (
          <p className="text-xs text-[#5a6278] text-center mt-4">{total} vote{total !== 1 ? 's' : ''}</p>
        )}
      </div>
    </div>
  )
}

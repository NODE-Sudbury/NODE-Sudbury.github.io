'use client'

import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import EmojiReactions from '@/components/events/EmojiReactions'

interface Question {
  id: string; body: string; upvotes: number; is_anonymous: boolean
  is_answered: boolean; is_moderated: boolean; created_at: string
  members?: { full_name: string | null }
  member_id: string
}

interface Props {
  eventId: string
  eventTitle: string
  isBoard: boolean
  userId: string | null
  initialQuestions: Question[]
}

export default function QAClient({ eventId, eventTitle, isBoard, userId, initialQuestions }: Props) {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions)
  const [body, setBody] = useState('')
  const [isAnon, setIsAnon] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [upvoted, setUpvoted] = useState<Set<string>>(new Set())
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const channel = supabase
      .channel(`qa:${eventId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'qa_questions', filter: `event_id=eq.${eventId}` },
        ({ new: q }) => setQuestions(prev => [q as Question, ...prev])
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'qa_questions', filter: `event_id=eq.${eventId}` },
        ({ new: q }) => setQuestions(prev => prev.map(x => x.id === (q as Question).id ? q as Question : x))
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [eventId])

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim() || !userId) return
    setSubmitting(true)
    await fetch('/api/qa/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, body: body.trim(), is_anonymous: isAnon }),
    })
    setBody('')
    setSubmitting(false)
  }

  async function handleUpvote(id: string) {
    if (!userId || upvoted.has(id)) return
    setUpvoted(prev => new Set([...prev, id]))
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, upvotes: q.upvotes + 1 } : q))
    await fetch('/api/qa/upvote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_id: id }),
    })
  }

  async function handleModerate(id: string, field: 'is_moderated' | 'is_answered', value: boolean) {
    await fetch('/api/qa/moderate', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_id: id, [field]: value }),
    })
  }

  const visible = questions.filter(q => isBoard || !q.is_moderated)
  const sorted = [...visible].sort((a, b) => b.upvotes - a.upvotes)

  return (
    <div className="min-h-screen bg-[#0b0e14] py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <p className="text-[#5a6278] text-sm mb-1">{eventTitle}</p>
          <h1 className="text-2xl font-semibold text-white">Live Q&A</h1>
          <p className="text-[#5a6278] text-sm mt-1">Upvote questions you want answered most.</p>
        </div>

        {userId ? (
          <form onSubmit={handleAsk} className="bg-[#13161f] border border-[#252b3a] rounded-xl p-4 mb-6 space-y-3">
            <textarea
              ref={textareaRef}
              value={body}
              onChange={e => setBody(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Ask a question..."
              className="w-full bg-[#0b0e14] border border-[#252b3a] rounded-lg text-white text-sm px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#f0e6d3]/30"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-[#5a6278] cursor-pointer">
                <input type="checkbox" checked={isAnon} onChange={e => setIsAnon(e.target.checked)}
                  className="rounded" />
                Ask anonymously
              </label>
              <Button type="submit" size="sm" disabled={submitting || !body.trim()}
                className="bg-[#f0e6d3] text-[#0b0e14] hover:bg-[#f0e6d3]/90">
                {submitting ? 'Posting...' : 'Ask'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="text-center py-6 mb-6 text-[#5a6278] text-sm">
            <a href="/login" className="text-[#f0e6d3] underline">Sign in</a> to ask a question.
          </div>
        )}

        <div className="mb-6">
          <EmojiReactions eventId={eventId} />
        </div>

        <div className="space-y-3">
          {sorted.length === 0 && (
            <p className="text-[#5a6278] text-sm text-center py-8">No questions yet. Be the first!</p>
          )}
          {sorted.map(q => (
            <div key={q.id}
              className={`bg-[#13161f] border rounded-xl p-4 ${q.is_moderated ? 'opacity-50 border-red-500/20' : 'border-[#252b3a]'}`}>
              <div className="flex gap-3">
                <button
                  onClick={() => handleUpvote(q.id)}
                  disabled={!userId || upvoted.has(q.id)}
                  className={`flex flex-col items-center gap-0.5 flex-shrink-0 transition-colors ${
                    upvoted.has(q.id) ? 'text-[#f0e6d3]' : 'text-[#5a6278] hover:text-[#f0e6d3]'
                  } disabled:cursor-not-allowed`}
                >
                  <span className="text-lg">▲</span>
                  <span className="text-xs font-semibold">{q.upvotes}</span>
                </button>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#c9d1e8]">{q.body}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-xs text-[#5a6278]">
                      {q.is_anonymous ? 'Anonymous' : (q.members?.full_name ?? 'Member')}
                    </span>
                    {q.is_answered && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
                        Answered
                      </span>
                    )}
                    {isBoard && q.is_moderated && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                        Hidden
                      </span>
                    )}
                  </div>
                </div>

                {isBoard && (
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button onClick={() => handleModerate(q.id, 'is_answered', !q.is_answered)}
                      className="text-xs text-[#5a6278] hover:text-green-400">
                      {q.is_answered ? 'Unmark' : 'Answered'}
                    </button>
                    <button onClick={() => handleModerate(q.id, 'is_moderated', !q.is_moderated)}
                      className="text-xs text-[#5a6278] hover:text-red-400">
                      {q.is_moderated ? 'Show' : 'Hide'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

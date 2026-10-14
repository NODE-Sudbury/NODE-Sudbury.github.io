'use client'

import { useState, useCallback } from 'react'

interface Challenge {
  id: string
  title: string
  description: string | null
  submission_type: string
  submission_instructions: string | null
  submissions_open_at: string | null
  submissions_close_at: string | null
  results_at: string | null
  allow_updates: boolean
}

interface Submission {
  id: string
  challenge_id: string
  title: string
  description: string | null
  submission_url: string | null
  submission_text: string | null
  status: string
  submitted_at: string | null
}

interface GalleryEntry {
  id: string
  title: string
  description: string | null
  submission_url: string | null
  submission_text: string | null
  status: string
  score: number | null
  members: { display_name: string; avatar_url: string | null } | null
  async_challenges: { title: string } | null
}

interface Comment {
  id: string
  content: string
  upvote_count: number
  created_at: string
  my_upvote: boolean
  members: { id: string; display_name: string; avatar_url: string | null } | null
}

interface Props {
  challenges: Challenge[]
  mySubmissions: Submission[]
  gallery: GalleryEntry[]
  isRegistered: boolean
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  reviewed: 'Reviewed',
  winner: 'Winner',
  honourable_mention: 'Honourable Mention',
}

function getSlug(): string {
  // Extract slug from the URL path: /events/[slug]/async
  const parts = window.location.pathname.split('/')
  const eventsIdx = parts.indexOf('events')
  return eventsIdx >= 0 ? parts[eventsIdx + 1] ?? '' : ''
}

// ---------------------------------------------------------------------------
// Discussion panel - one per challenge (window)
// ---------------------------------------------------------------------------
function DiscussionPanel({ windowId, isRegistered }: { windowId: string; isRegistered: boolean }) {
  const [open, setOpen] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sort, setSort] = useState<'top' | 'newest'>('top')
  const [commentText, setCommentText] = useState('')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)
  const [upvotingIds, setUpvotingIds] = useState<Set<string>>(new Set())

  const fetchComments = useCallback(async () => {
    setLoading(true)
    try {
      const slug = getSlug()
      const res = await fetch(
        `/api/events/${slug}/async/comments?window_id=${encodeURIComponent(windowId)}`
      )
      if (res.ok) {
        const json = await res.json()
        setComments(json.comments ?? [])
        setLoaded(true)
      }
    } finally {
      setLoading(false)
    }
  }, [windowId])

  const handleToggle = () => {
    const next = !open
    setOpen(next)
    if (next && !loaded) fetchComments()
  }

  const sortedComments = [...comments].sort((a, b) => {
    if (sort === 'top') {
      if (b.upvote_count !== a.upvote_count) return b.upvote_count - a.upvote_count
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const handlePost = async () => {
    if (!commentText.trim()) return
    setPosting(true)
    setPostError(null)
    try {
      const slug = getSlug()
      const res = await fetch(`/api/events/${slug}/async/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ window_id: windowId, content: commentText.trim() }),
      })
      const json = await res.json()
      if (!res.ok) {
        setPostError(json.error ?? 'Failed to post comment')
      } else {
        setComments(prev => [json.comment, ...prev])
        setCommentText('')
      }
    } finally {
      setPosting(false)
    }
  }

  const handleUpvote = async (commentId: string) => {
    if (upvotingIds.has(commentId)) return
    setUpvotingIds(prev => new Set(prev).add(commentId))
    try {
      const slug = getSlug()
      const res = await fetch(
        `/api/events/${slug}/async/comments/${commentId}/upvote`,
        { method: 'POST' }
      )
      if (res.ok) {
        const json = await res.json()
        setComments(prev =>
          prev.map(c =>
            c.id === commentId
              ? { ...c, upvote_count: json.count, my_upvote: json.upvoted }
              : c
          )
        )
      }
    } finally {
      setUpvotingIds(prev => {
        const s = new Set(prev)
        s.delete(commentId)
        return s
      })
    }
  }

  return (
    <div className="border-t" style={{ borderColor: '#252b3a' }}>
      {/* Collapsible header */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-6 py-3 text-sm font-medium transition-colors hover:opacity-80"
        style={{ color: '#8892a4', background: 'transparent' }}
      >
        <span style={{ color: '#e2e8f0' }}>
          Discussion
          {loaded && (
            <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full" style={{ background: '#252b3a', color: '#8892a4' }}>
              {comments.length}
            </span>
          )}
        </span>
        <svg
          className="w-4 h-4 transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', color: '#8892a4' }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-4">
          {/* Sort controls */}
          {loaded && comments.length > 1 && (
            <div className="flex gap-2">
              {(['top', 'newest'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className="text-xs px-3 py-1 rounded-full border transition-colors"
                  style={{
                    borderColor: sort === s ? '#38bdf8' : '#252b3a',
                    color: sort === s ? '#38bdf8' : '#8892a4',
                    background: 'transparent',
                  }}
                >
                  {s === 'top' ? 'Top' : 'Newest'}
                </button>
              ))}
            </div>
          )}

          {/* Comment list */}
          {loading && !loaded && (
            <p className="text-sm" style={{ color: '#8892a4' }}>Loading discussion...</p>
          )}

          {loaded && sortedComments.length === 0 && (
            <p className="text-sm" style={{ color: '#8892a4' }}>
              No comments yet. Be the first to start the discussion.
            </p>
          )}

          {sortedComments.map(comment => (
            <div
              key={comment.id}
              className="flex gap-3 p-3 rounded-lg"
              style={{ background: '#13161f', border: '1px solid #252b3a' }}
            >
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold"
                style={{ background: '#252b3a', color: '#38bdf8' }}
              >
                {comment.members?.avatar_url ? (
                  <img
                    src={comment.members.avatar_url}
                    alt={comment.members.display_name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  (comment.members?.display_name?.[0] ?? '?').toUpperCase()
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>
                    {comment.members?.display_name ?? 'Member'}
                  </span>
                  <span className="text-xs" style={{ color: '#8892a4' }}>
                    {new Date(comment.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <p className="text-sm" style={{ color: '#e2e8f0', lineHeight: '1.55' }}>
                  {comment.content}
                </p>
                {/* Upvote */}
                <button
                  onClick={() => handleUpvote(comment.id)}
                  disabled={upvotingIds.has(comment.id)}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs rounded-full px-2 py-0.5 border transition-colors disabled:opacity-50"
                  style={{
                    borderColor: comment.my_upvote ? '#38bdf8' : '#252b3a',
                    color: comment.my_upvote ? '#38bdf8' : '#8892a4',
                    background: comment.my_upvote ? 'rgba(56,189,248,0.08)' : 'transparent',
                  }}
                >
                  <svg className="w-3 h-3" fill={comment.my_upvote ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                  {comment.upvote_count}
                </button>
              </div>
            </div>
          ))}

          {/* Add comment */}
          {isRegistered ? (
            <div className="space-y-2 pt-1">
              <textarea
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                maxLength={2000}
                className="w-full text-sm rounded-lg px-3 py-2 resize-none focus:outline-none"
                style={{
                  background: '#13161f',
                  border: '1px solid #252b3a',
                  color: '#e2e8f0',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = '#38bdf8' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#252b3a' }}
              />
              {postError && (
                <p className="text-xs" style={{ color: '#f87171' }}>{postError}</p>
              )}
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePost}
                  disabled={posting || !commentText.trim()}
                  className="px-4 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  style={{ background: '#38bdf8', color: '#0d1117' }}
                >
                  {posting ? 'Posting...' : 'Post'}
                </button>
                <span className="text-xs" style={{ color: '#8892a4' }}>
                  {commentText.length}/2000
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs" style={{ color: '#8892a4' }}>
              You must be registered for this event to comment.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export function AsyncEventClient({ challenges, mySubmissions, gallery, isRegistered }: Props) {
  const now = new Date()

  return (
    <div className="space-y-10">
      {challenges.map(challenge => {
        const my = mySubmissions.find(s => s.challenge_id === challenge.id)
        const isOpen = (!challenge.submissions_open_at || new Date(challenge.submissions_open_at) <= now)
          && (!challenge.submissions_close_at || new Date(challenge.submissions_close_at) > now)
        const hasResults = challenge.results_at && new Date(challenge.results_at) <= now
        const challengeGallery = gallery.filter(g => g.async_challenges?.title === challenge.title)

        return (
          <div
            key={challenge.id}
            className="rounded-xl overflow-hidden"
            style={{ background: '#13161f', border: '1px solid #252b3a' }}
          >
            <div className="p-6">
              <h2 className="text-xl font-bold mb-2" style={{ color: '#e2e8f0' }}>{challenge.title}</h2>
              {challenge.description && (
                <p className="mb-4 text-sm" style={{ color: '#8892a4' }}>{challenge.description}</p>
              )}

              {/* Status banner */}
              {isOpen ? (
                <div
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm mb-4"
                  style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}
                >
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  Submissions open
                  {challenge.submissions_close_at && (
                    <span className="opacity-75">
                      until {new Date(challenge.submissions_close_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ) : hasResults ? (
                <div
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm mb-4"
                  style={{ background: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)' }}
                >
                  Results announced
                </div>
              ) : (
                <div
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm mb-4"
                  style={{ background: '#252b3a', color: '#8892a4', border: '1px solid #252b3a' }}
                >
                  Submissions closed
                  {challenge.results_at && (
                    <span> - results {new Date(challenge.results_at).toLocaleDateString()}</span>
                  )}
                </div>
              )}

              {/* Submission form */}
              {isRegistered && isOpen && (
                <ChallengeForm challenge={challenge} existing={my ?? null} />
              )}

              {/* Existing submission (read-only when closed) */}
              {my && !isOpen && (
                <div
                  className="mt-4 p-4 rounded-lg"
                  style={{ background: '#0d1117', border: '1px solid #252b3a' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>{my.title}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={
                        my.status === 'winner'
                          ? { background: 'rgba(234,179,8,0.15)', color: '#eab308' }
                          : my.status === 'submitted'
                          ? { background: 'rgba(56,189,248,0.12)', color: '#38bdf8' }
                          : { background: '#252b3a', color: '#8892a4' }
                      }
                    >
                      {STATUS_LABELS[my.status] ?? my.status}
                    </span>
                  </div>
                  {my.submission_url && (
                    <a
                      href={my.submission_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm hover:underline"
                      style={{ color: '#38bdf8' }}
                    >
                      {my.submission_url}
                    </a>
                  )}
                  {my.submission_text && (
                    <p className="text-sm mt-1" style={{ color: '#8892a4' }}>{my.submission_text}</p>
                  )}
                </div>
              )}
            </div>

            {/* Gallery */}
            {hasResults && challengeGallery.length > 0 && (
              <div className="px-6 pb-6" style={{ borderTop: '1px solid #252b3a', paddingTop: '1.5rem' }}>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#8892a4' }}>
                  Submissions
                </h3>
                <div className="space-y-3">
                  {challengeGallery.map(entry => (
                    <div
                      key={entry.id}
                      className="p-4 rounded-lg"
                      style={
                        entry.status === 'winner'
                          ? { background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)' }
                          : { background: '#0d1117', border: '1px solid #252b3a' }
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold" style={{ color: '#e2e8f0' }}>{entry.title}</span>
                          {entry.members && (
                            <span className="text-sm ml-2" style={{ color: '#8892a4' }}>
                              by {entry.members.display_name}
                            </span>
                          )}
                        </div>
                        {entry.status === 'winner' && (
                          <span className="text-sm font-bold" style={{ color: '#eab308' }}>Winner</span>
                        )}
                        {entry.status === 'honourable_mention' && (
                          <span className="text-sm" style={{ color: '#38bdf8' }}>Honourable Mention</span>
                        )}
                      </div>
                      {entry.description && (
                        <p className="text-sm mt-1" style={{ color: '#8892a4' }}>{entry.description}</p>
                      )}
                      {entry.submission_url && (
                        <a
                          href={entry.submission_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm hover:underline mt-1 inline-block"
                          style={{ color: '#38bdf8' }}
                        >
                          {entry.submission_url}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Per-window discussion thread */}
            <DiscussionPanel windowId={challenge.id} isRegistered={isRegistered} />
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Challenge submission form
// ---------------------------------------------------------------------------
function ChallengeForm({ challenge, existing }: { challenge: Challenge; existing: Submission | null }) {
  const [title, setTitle] = useState(existing?.title ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [url, setUrl] = useState(existing?.submission_url ?? '')
  const [text, setText] = useState(existing?.submission_text ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [submitted, setSubmitted] = useState(existing?.status === 'submitted')

  const isTextType = challenge.submission_type === 'text'

  const save = async (status: 'draft' | 'submitted') => {
    setSaving(true)
    setSaved(false)
    try {
      const eventId = window.location.pathname.split('/events/')[1]?.split('/')[0]
      await fetch(`/api/async/${eventId}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge_id: challenge.id,
          title, description,
          submission_url: isTextType ? undefined : url,
          submission_text: isTextType ? text : undefined,
          status,
        }),
      })
      setSaved(true)
      if (status === 'submitted') setSubmitted(true)
    } finally {
      setSaving(false)
    }
  }

  if (submitted && !challenge.allow_updates) {
    return (
      <div
        className="mt-4 p-4 rounded-lg text-sm"
        style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' }}
      >
        Submitted successfully.
      </div>
    )
  }

  const inputStyle = {
    background: '#0d1117',
    border: '1px solid #252b3a',
    color: '#e2e8f0',
    borderRadius: '0.5rem',
    padding: '0.5rem 0.75rem',
    width: '100%',
    fontSize: '0.875rem',
    outline: 'none',
  }

  return (
    <div className="mt-4 space-y-3">
      {challenge.submission_instructions && (
        <p className="text-sm italic" style={{ color: '#8892a4' }}>{challenge.submission_instructions}</p>
      )}
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Submission title"
        style={inputStyle}
        onFocus={e => { e.currentTarget.style.borderColor = '#38bdf8' }}
        onBlur={e => { e.currentTarget.style.borderColor = '#252b3a' }}
      />
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={3}
        style={{ ...inputStyle, resize: 'none' }}
        onFocus={e => { e.currentTarget.style.borderColor = '#38bdf8' }}
        onBlur={e => { e.currentTarget.style.borderColor = '#252b3a' }}
      />
      {isTextType ? (
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Your submission"
          rows={6}
          style={{ ...inputStyle, resize: 'none' }}
          onFocus={e => { e.currentTarget.style.borderColor = '#38bdf8' }}
          onBlur={e => { e.currentTarget.style.borderColor = '#252b3a' }}
        />
      ) : (
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder={challenge.submission_type === 'github' ? 'GitHub repository URL' : 'Submission URL'}
          type="url"
          style={inputStyle}
          onFocus={e => { e.currentTarget.style.borderColor = '#38bdf8' }}
          onBlur={e => { e.currentTarget.style.borderColor = '#252b3a' }}
        />
      )}
      <div className="flex gap-2">
        <button
          onClick={() => save('draft')}
          disabled={saving || !title}
          className="px-4 py-2 text-sm rounded-lg font-medium disabled:opacity-50 transition-colors"
          style={{ background: '#252b3a', color: '#e2e8f0' }}
        >
          {saving ? 'Saving...' : 'Save Draft'}
        </button>
        <button
          onClick={() => save('submitted')}
          disabled={saving || !title}
          className="px-4 py-2 text-sm rounded-lg font-medium disabled:opacity-50 transition-colors"
          style={{ background: '#38bdf8', color: '#0d1117' }}
        >
          Submit
        </button>
        {saved && (
          <span className="text-sm self-center" style={{ color: '#4ade80' }}>Saved!</span>
        )}
      </div>
    </div>
  )
}

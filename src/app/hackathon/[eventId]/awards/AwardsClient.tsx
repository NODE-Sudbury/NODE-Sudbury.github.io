'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface Award {
  id: string
  name: string
  description: string | null
  award_type: 'judged' | 'community_vote' | 'special'
  icon_emoji: string | null
}

interface Recipient {
  id: string
  award_id: string
  notes: string | null
  awarded_at: string
  team: { id: string; name: string } | null
  member: { id: string; full_name: string } | null
}

interface VoteRow { award_id: string; team_id: string }

interface Submission {
  id: string
  title: string
  team_id: string | null
  demo_url: string | null
  hackathon_teams: { name: string } | null
}

interface MyVote { award_id: string; team_id: string }

interface Props {
  event: { id: string; title: string; slug: string }
  judgingClosed: boolean
  awards: Award[]
  recipients: Recipient[]
  voteCounts: VoteRow[]
  submissions: Submission[]
  myVotes: MyVote[]
  memberId: string | null
}

function ShareButtons({
  teamName,
  awardName,
  eventTitle,
  eventId,
}: {
  teamName: string
  awardName: string
  eventTitle: string
  eventId: string
}) {
  const [copied, setCopied] = useState(false)

  const eventUrl = `https://nodesudbury.com/hackathon/${eventId}/awards`

  const tweetText = `Our team ${teamName} won ${awardName} at ${eventTitle}! Built with NODE Sudbury. #NODESudbury #hackathon`
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`

  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(eventUrl)}`

  const copyText = `${teamName} won ${awardName} at ${eventTitle}! #NODESudbury`

  function handleCopy() {
    navigator.clipboard.writeText(copyText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const pillBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 999,
    padding: '4px 12px',
    cursor: 'pointer',
    border: '1px solid',
    textDecoration: 'none',
    lineHeight: 1.4,
    transition: 'opacity 0.15s',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 11, color: '#5a6278', fontWeight: 500, whiteSpace: 'nowrap' }}>
        Share this win:
      </span>
      <a
        href={tweetUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          ...pillBase,
          background: 'rgba(29,161,242,0.10)',
          color: '#1da1f2',
          borderColor: 'rgba(29,161,242,0.30)',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        Share on X
      </a>
      <a
        href={linkedInUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          ...pillBase,
          background: 'rgba(10,102,194,0.10)',
          color: '#0a66c2',
          borderColor: 'rgba(10,102,194,0.30)',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
        Share on LinkedIn
      </a>
      <button
        onClick={handleCopy}
        style={{
          ...pillBase,
          background: copied ? 'rgba(154,206,106,0.12)' : 'rgba(255,255,255,0.05)',
          color: copied ? '#9ece6a' : '#8088a2',
          borderColor: copied ? 'rgba(154,206,106,0.35)' : '#252b3a',
          fontFamily: 'inherit',
        }}
      >
        {copied ? (
          <>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
            </svg>
            Copy
          </>
        )}
      </button>
    </div>
  )
}

export default function AwardsClient({ event, judgingClosed, awards, recipients, voteCounts, submissions, myVotes, memberId }: Props) {
  const [voting, setVoting] = useState<Record<string, boolean>>({})
  const [voted, setVoted] = useState<Record<string, string>>(
    Object.fromEntries(myVotes.map(v => [v.award_id, v.team_id]))
  )
  const [voteCount, setVoteCount] = useState<Record<string, Record<string, number>>>(
    voteCounts.reduce((acc, v) => {
      if (!acc[v.award_id]) acc[v.award_id] = {}
      acc[v.award_id][v.team_id] = (acc[v.award_id][v.team_id] ?? 0) + 1
      return acc
    }, {} as Record<string, Record<string, number>>)
  )

  const recipientsByAward = recipients.reduce((acc, r) => {
    if (!acc[r.award_id]) acc[r.award_id] = []
    acc[r.award_id].push(r)
    return acc
  }, {} as Record<string, Recipient[]>)

  const communityAwards = awards.filter(a => a.award_type === 'community_vote')
  const otherAwards = awards.filter(a => a.award_type !== 'community_vote')

  async function castVote(awardId: string, teamId: string) {
    if (!memberId) { window.location.href = `/login?next=/hackathon/${event.id}/awards`; return }
    setVoting(v => ({ ...v, [awardId]: true }))
    try {
      const res = await fetch('/api/hackathon/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ award_id: awardId, team_id: teamId }),
      })
      if (res.ok) {
        setVoted(v => ({ ...v, [awardId]: teamId }))
        setVoteCount(vc => ({
          ...vc,
          [awardId]: { ...(vc[awardId] ?? {}), [teamId]: ((vc[awardId]?.[teamId]) ?? 0) + 1 },
        }))
      }
    } finally {
      setVoting(v => ({ ...v, [awardId]: false }))
    }
  }

  const MEDAL: Record<number, string> = { 0: '🥇', 1: '🥈', 2: '🥉' }

  return (
    <div style={{ minHeight: '100vh', background: '#0b0e14', color: '#c9d1e8', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #252b3a', padding: '16px 24px' }}>
        <div style={{ fontSize: 12, color: '#5a6278', marginBottom: 4 }}>{event.title}</div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Awards</h1>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        {awards.length === 0 && (
          <p style={{ color: '#5a6278', fontSize: 14 }}>No awards have been configured for this hackathon yet.</p>
        )}

        {/* Judged + Special awards */}
        {otherAwards.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#8088a2', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>
              {judgingClosed ? 'Winners' : 'Awards'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {otherAwards.map((award, i) => {
                const awardRecipients = recipientsByAward[award.id] ?? []
                return (
                  <div key={award.id} style={{ background: '#13161f', border: '1px solid #252b3a', borderRadius: 12, padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: awardRecipients.length ? 16 : 0 }}>
                      <span style={{ fontSize: 28 }}>{award.icon_emoji ?? '🏆'}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{award.name}</div>
                        {award.description && <div style={{ fontSize: 13, color: '#6c7086', marginTop: 2 }}>{award.description}</div>}
                      </div>
                      {!judgingClosed && (
                        <span style={{ marginLeft: 'auto', fontSize: 11, background: 'rgba(240,230,211,0.08)', color: '#f0e6d3', padding: '3px 8px', borderRadius: 4 }}>Judging open</span>
                      )}
                    </div>

                    {judgingClosed && awardRecipients.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {awardRecipients.map((r, idx) => {
                          const winnerName = r.team?.name ?? r.member?.full_name ?? 'Unknown'
                          return (
                            <div key={r.id}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#0b0e14', borderRadius: 8, padding: '10px 14px' }}>
                                <span style={{ fontSize: 20 }}>{MEDAL[idx] ?? '🏅'}</span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                                    {winnerName}
                                  </div>
                                  {r.notes && <div style={{ fontSize: 12, color: '#6c7086', marginTop: 2 }}>{r.notes}</div>}
                                </div>
                              </div>
                              <ShareButtons
                                teamName={winnerName}
                                awardName={award.name}
                                eventTitle={event.title}
                                eventId={event.id}
                              />
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {judgingClosed && awardRecipients.length === 0 && (
                      <p style={{ fontSize: 13, color: '#5a6278', margin: 0 }}>Winner not yet announced.</p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Community vote awards */}
        {communityAwards.length > 0 && (
          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#8088a2', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>
              Community Choice
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {communityAwards.map(award => {
                const awardRecipients = recipientsByAward[award.id] ?? []
                const counts = voteCount[award.id] ?? {}
                const myTeamVote = voted[award.id]
                const hasVoted = !!myTeamVote
                const isVoting = voting[award.id]

                return (
                  <div key={award.id} style={{ background: '#13161f', border: '1px solid #252b3a', borderRadius: 12, padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <span style={{ fontSize: 28 }}>{award.icon_emoji ?? '⭐'}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{award.name}</div>
                        {award.description && <div style={{ fontSize: 13, color: '#6c7086', marginTop: 2 }}>{award.description}</div>}
                      </div>
                    </div>

                    {judgingClosed && awardRecipients.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {awardRecipients.map((r, idx) => {
                          const winnerName = r.team?.name ?? r.member?.full_name ?? 'Unknown'
                          return (
                            <div key={r.id}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#0b0e14', borderRadius: 8, padding: '10px 14px' }}>
                                <span style={{ fontSize: 20 }}>{MEDAL[idx] ?? '🏅'}</span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 600, fontSize: 14 }}>{winnerName}</div>
                                  {r.notes && <div style={{ fontSize: 12, color: '#6c7086', marginTop: 2 }}>{r.notes}</div>}
                                </div>
                              </div>
                              <ShareButtons
                                teamName={winnerName}
                                awardName={award.name}
                                eventTitle={event.title}
                                eventId={event.id}
                              />
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {hasVoted && (
                          <p style={{ fontSize: 12, color: '#9ece6a', margin: '0 0 8px', fontWeight: 500 }}>
                            You voted! Your vote is counted.
                          </p>
                        )}
                        {submissions.filter(s => s.team_id).map(sub => {
                          const teamVotes = counts[sub.team_id!] ?? 0
                          const isMyVote = myTeamVote === sub.team_id
                          return (
                            <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: isMyVote ? 'rgba(240,230,211,0.06)' : '#0b0e14', border: `1px solid ${isMyVote ? 'rgba(240,230,211,0.2)' : '#1e2333'}`, borderRadius: 8, padding: '10px 14px' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: 14 }}>{sub.hackathon_teams?.name ?? 'Team'}</div>
                                <div style={{ fontSize: 12, color: '#6c7086' }}>{sub.title}</div>
                              </div>
                              <span style={{ fontSize: 12, color: '#5a6278', marginRight: 8 }}>{teamVotes} vote{teamVotes !== 1 ? 's' : ''}</span>
                              {!hasVoted && memberId && (
                                <Button
                                  size="sm"
                                  disabled={isVoting}
                                  onClick={() => castVote(award.id, sub.team_id!)}
                                  style={{ background: '#f0e6d3', color: '#0b0e14', fontWeight: 600, fontSize: 12 }}
                                >
                                  {isVoting ? '...' : 'Vote'}
                                </Button>
                              )}
                              {isMyVote && <span style={{ fontSize: 18 }}>✓</span>}
                              {!memberId && (
                                <Button size="sm" variant="outline" onClick={() => window.location.href = `/login?next=/hackathon/${event.id}/awards`} style={{ fontSize: 12 }}>
                                  Sign in to vote
                                </Button>
                              )}
                            </div>
                          )
                        })}
                        {submissions.filter(s => s.team_id).length === 0 && (
                          <p style={{ fontSize: 13, color: '#5a6278', margin: 0 }}>No submissions to vote on yet.</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

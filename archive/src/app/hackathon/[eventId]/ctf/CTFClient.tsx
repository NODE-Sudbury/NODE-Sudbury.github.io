'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'

interface Challenge {
  id: string
  title: string
  description: string
  category: string
  points: number
  difficulty: 'easy' | 'medium' | 'hard'
  flag_format_hint: string | null
  hint_cost_points: number | null
  hints: string[] | null
}

interface HintPurchase { challenge_id: string; hint_index: number }

interface Props {
  event: { id: string; title: string }
  challenges: Challenge[]
  solvedIds: string[]
  hintPurchases: HintPurchase[]
  leaderboard: any[]
  memberId: string
}

const DIFF_COLOR: Record<string, string> = {
  easy: 'rgba(158,206,106,0.15)',
  medium: 'rgba(224,175,104,0.15)',
  hard: 'rgba(247,118,142,0.15)',
}
const DIFF_TEXT: Record<string, string> = {
  easy: '#9ece6a',
  medium: '#e0af68',
  hard: '#f7768e',
}

export default function CTFClient({ event, challenges, solvedIds, hintPurchases, leaderboard, memberId }: Props) {
  const [tab, setTab] = useState<'challenges' | 'scoreboard'>('challenges')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [flags, setFlags] = useState<Record<string, string>>({})
  const [results, setResults] = useState<Record<string, { correct: boolean; message: string }>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [solved, setSolved] = useState<Set<string>>(new Set(solvedIds))
  const [purchased, setPurchased] = useState<Map<string, number[]>>(
    new Map(
      Object.entries(
        hintPurchases.reduce((acc: Record<string, number[]>, h) => {
          acc[h.challenge_id] = [...(acc[h.challenge_id] ?? []), h.hint_index]
          return acc
        }, {})
      )
    )
  )
  const [revealedHints, setRevealedHints] = useState<Record<string, Record<number, string>>>({})

  const categories = ['all', ...Array.from(new Set(challenges.map(c => c.category)))]
  const filtered = challenges.filter(c => categoryFilter === 'all' || c.category === categoryFilter)

  async function submitFlag(challengeId: string) {
    const flag = flags[challengeId]?.trim()
    if (!flag) return
    setLoading(l => ({ ...l, [challengeId]: true }))
    try {
      const res = await fetch('/api/ctf/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge_id: challengeId, flag }),
      })
      const data = await res.json()
      if (res.status === 409) {
        setResults(r => ({ ...r, [challengeId]: { correct: true, message: 'Already solved!' } }))
      } else if (data.correct) {
        setSolved(s => new Set([...s, challengeId]))
        setResults(r => ({ ...r, [challengeId]: { correct: true, message: `Correct! +${data.points_earned} pts` } }))
      } else {
        setResults(r => ({ ...r, [challengeId]: { correct: false, message: 'Incorrect flag. Try again.' } }))
      }
    } finally {
      setLoading(l => ({ ...l, [challengeId]: false }))
    }
  }

  async function buyHint(challengeId: string, hintIndex: number) {
    setLoading(l => ({ ...l, [`hint-${challengeId}-${hintIndex}`]: true }))
    try {
      const res = await fetch('/api/ctf/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge_id: challengeId, hint_index: hintIndex }),
      })
      const data = await res.json()
      if (res.ok) {
        setPurchased(p => {
          const m = new Map(p)
          m.set(challengeId, [...(m.get(challengeId) ?? []), hintIndex])
          return m
        })
        setRevealedHints(r => ({
          ...r,
          [challengeId]: { ...(r[challengeId] ?? {}), [hintIndex]: data.hint_text },
        }))
      }
    } finally {
      setLoading(l => ({ ...l, [`hint-${challengeId}-${hintIndex}`]: false }))
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0b0e14', color: '#c9d1e8', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #252b3a', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12, color: '#5a6278', marginBottom: 4 }}>{event.title}</div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>CTF Challenges</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {(['challenges', 'scoreboard'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                background: tab === t ? '#f0e6d3' : '#1a1f2c',
                color: tab === t ? '#0b0e14' : '#c9d1e8',
              }}
            >
              {t === 'challenges' ? 'Challenges' : 'Scoreboard'}
            </button>
          ))}
          <Link
            href={`/hackathon/${event.id}/ctf/scoreboard`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 6,
              border: '1px solid #22c55e44',
              background: 'rgba(34,197,94,0.08)',
              color: '#22c55e',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              letterSpacing: '0.01em',
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 5px #22c55e', display: 'inline-block', flexShrink: 0 }} />
            Live Scoreboard
          </Link>
        </div>
      </div>

      {tab === 'scoreboard' ? (
        <div style={{ maxWidth: 700, margin: '32px auto', padding: '0 24px' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>CTF Scoreboard</h2>
          {leaderboard.length === 0 ? (
            <p style={{ color: '#5a6278', fontSize: 14 }}>No solves yet. Be the first!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {leaderboard.map((row: any, i) => (
                <div key={i} style={{ background: '#13161f', border: '1px solid #252b3a', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: i === 0 ? '#f9e2af' : i === 1 ? '#cdd6f4' : i === 2 ? '#e0af68' : '#5a6278', width: 24 }}>#{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 14 }}>{row.member_name ?? row.team_name ?? 'Unknown'}</span>
                  <span style={{ fontFamily: 'monospace', color: '#9ece6a', fontWeight: 600 }}>{row.total_points ?? row.score ?? 0} pts</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', maxWidth: 1100, margin: '0 auto', padding: '24px' }}>
          {/* Sidebar */}
          <aside style={{ width: 160, flexShrink: 0, marginRight: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#5a6278', marginBottom: 10 }}>Category</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  style={{
                    textAlign: 'left', padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 500, textTransform: 'capitalize',
                    background: categoryFilter === cat ? 'rgba(240,230,211,0.1)' : 'transparent',
                    color: categoryFilter === cat ? '#f0e6d3' : '#6c7086',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
            <Separator style={{ margin: '16px 0', background: '#252b3a' }} />
            <div style={{ fontSize: 12, color: '#5a6278' }}>
              <span style={{ color: '#9ece6a', fontWeight: 600 }}>{solved.size}</span>/{challenges.length} solved
            </div>
          </aside>

          {/* Challenge grid */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.length === 0 && <p style={{ color: '#5a6278', fontSize: 14 }}>No challenges in this category.</p>}
            {filtered.map(c => {
              const isSolved = solved.has(c.id)
              const isExpanded = expanded === c.id
              const purchasedHints = purchased.get(c.id) ?? []
              const result = results[c.id]
              return (
                <div key={c.id} style={{ background: '#13161f', border: `1px solid ${isSolved ? 'rgba(158,206,106,0.3)' : '#252b3a'}`, borderRadius: 10, overflow: 'hidden' }}>
                  <div
                    onClick={() => setExpanded(isExpanded ? null : c.id)}
                    style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                  >
                    <span style={{ fontSize: 16 }}>{isSolved ? '✓' : '○'}</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{c.title}</span>
                      <span style={{ marginLeft: 8, fontSize: 11, background: '#1a1f2c', color: '#6c7086', padding: '2px 7px', borderRadius: 4, textTransform: 'capitalize' }}>{c.category}</span>
                    </div>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f0e6d3', fontSize: 14 }}>{c.points} pts</span>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: DIFF_COLOR[c.difficulty], color: DIFF_TEXT[c.difficulty], textTransform: 'capitalize' }}>{c.difficulty}</span>
                    <span style={{ color: '#5a6278', fontSize: 12 }}>{isExpanded ? '▲' : '▼'}</span>
                  </div>

                  {isExpanded && (
                    <div style={{ borderTop: '1px solid #252b3a', padding: '16px' }}>
                      <p style={{ fontSize: 13, color: '#8088a2', marginBottom: 12, lineHeight: 1.6 }}>{c.description}</p>
                      {c.flag_format_hint && (
                        <p style={{ fontSize: 12, color: '#5a6278', marginBottom: 12 }}>Format hint: <code style={{ color: '#73daca' }}>{c.flag_format_hint}</code></p>
                      )}

                      {/* Hints */}
                      {c.hints && c.hints.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          {c.hints.map((_, idx) => {
                            const alreadyBought = purchasedHints.includes(idx)
                            const hintText = revealedHints[c.id]?.[idx]
                            return (
                              <div key={idx} style={{ marginBottom: 6 }}>
                                {alreadyBought && hintText ? (
                                  <p style={{ fontSize: 12, color: '#e0af68', background: 'rgba(224,175,104,0.08)', padding: '8px 12px', borderRadius: 6 }}>💡 {hintText}</p>
                                ) : alreadyBought ? (
                                  <Button size="sm" variant="outline" onClick={() => buyHint(c.id, idx)} style={{ fontSize: 12 }}>Reveal hint {idx + 1}</Button>
                                ) : (
                                  <Button
                                    size="sm" variant="outline"
                                    disabled={loading[`hint-${c.id}-${idx}`]}
                                    onClick={() => buyHint(c.id, idx)}
                                    style={{ fontSize: 12 }}
                                  >
                                    Buy hint {idx + 1} ({c.hint_cost_points ?? 10} pts)
                                  </Button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Flag submit */}
                      {isSolved ? (
                        <p style={{ color: '#9ece6a', fontSize: 13, fontWeight: 600 }}>✓ Solved!</p>
                      ) : (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <Input
                            placeholder="FLAG{...}"
                            value={flags[c.id] ?? ''}
                            onChange={e => setFlags(f => ({ ...f, [c.id]: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && submitFlag(c.id)}
                            style={{ fontFamily: 'monospace', fontSize: 13, background: '#0b0e14', border: '1px solid #2e3548', color: '#c9d1e8', maxWidth: 300 }}
                          />
                          <Button
                            size="sm"
                            disabled={loading[c.id]}
                            onClick={() => submitFlag(c.id)}
                            style={{ background: '#f0e6d3', color: '#0b0e14', fontWeight: 600 }}
                          >
                            {loading[c.id] ? '...' : 'Submit'}
                          </Button>
                          {result && (
                            <span style={{ fontSize: 12, color: result.correct ? '#9ece6a' : '#f7768e' }}>{result.message}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

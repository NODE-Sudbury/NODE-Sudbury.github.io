'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface ScoreRow {
  rank: number
  name: string
  score: number
  solves: number | null
  last_solve_at: string | null
  categories: Record<string, number> | null
}

interface Props {
  eventId: string
  eventTitle: string
}

function formatTime(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

const RANK_STYLES: Record<number, { border: string; glow: string; badge: string; label: string }> = {
  1: {
    border: '#ffd700',
    glow: '0 0 0 2px #ffd70055, 0 0 18px #ffd70033',
    badge: 'linear-gradient(135deg, #ffd700, #b8860b)',
    label: '01',
  },
  2: {
    border: '#c0c0c0',
    glow: '0 0 0 2px #c0c0c033',
    badge: 'linear-gradient(135deg, #c0c0c0, #808080)',
    label: '02',
  },
  3: {
    border: '#cd7f32',
    glow: '0 0 0 2px #cd7f3233',
    badge: 'linear-gradient(135deg, #cd7f32, #8b4513)',
    label: '03',
  },
}

export default function ScoreboardClient({ eventId, eventTitle }: Props) {
  const [scores, setScores] = useState<ScoreRow[]>([])
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [live, setLive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<string[]>([])

  const fetchScores = useCallback(async () => {
    try {
      const res = await fetch(`/api/ctf/scoreboard?event_id=${eventId}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const rows: ScoreRow[] = data.scores ?? []
      setScores(rows)
      setUpdatedAt(data.updated_at ?? null)

      const cats = new Set<string>()
      for (const row of rows) {
        if (row.categories) Object.keys(row.categories).forEach(c => cats.add(c))
      }
      setCategories([...cats].sort())
      setError(null)
    } catch (e: any) {
      setError(e.message ?? 'Failed to load')
    } finally {
      setLoading(false)
      setLive(true)
    }
  }, [eventId])

  useEffect(() => {
    fetchScores()
    const interval = setInterval(fetchScores, 30000)
    return () => clearInterval(interval)
  }, [fetchScores])

  const showCategories = categories.length > 1

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0b0e14',
      color: '#e2e8f0',
      fontFamily: "'JetBrains Mono', 'Fira Mono', 'Cascadia Code', monospace, system-ui",
    }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid #252b3a',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href={`/hackathon/${eventId}/ctf`} style={{
            color: '#8892a4',
            fontSize: 13,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <span style={{ fontSize: 16 }}>&#8592;</span> Challenges
          </Link>
          <div style={{ width: 1, height: 20, background: '#252b3a' }} />
          <div>
            <div style={{ fontSize: 11, color: '#8892a4', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{eventTitle}</div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.01em' }}>
              CTF Scoreboard
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {live && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                display: 'inline-block',
                width: 8, height: 8,
                borderRadius: '50%',
                background: '#22c55e',
                boxShadow: '0 0 6px #22c55e',
                animation: 'pulse 2s infinite',
              }} />
              <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>LIVE</span>
            </div>
          )}
          {updatedAt && (
            <span style={{ fontSize: 11, color: '#8892a4' }}>
              Updated {formatTime(updatedAt)}
            </span>
          )}
          <button
            onClick={fetchScores}
            style={{
              padding: '5px 12px',
              borderRadius: 6,
              border: '1px solid #252b3a',
              background: 'transparent',
              color: '#8892a4',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .score-row:hover {
          background: #161b27 !important;
        }
      `}</style>

      <div style={{ maxWidth: 900, margin: '32px auto', padding: '0 24px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#8892a4', fontSize: 14 }}>
            Loading scoreboard...
          </div>
        )}

        {error && !loading && (
          <div style={{
            background: '#13161f',
            border: '1px solid #f7768e44',
            borderRadius: 8,
            padding: '16px 20px',
            color: '#f7768e',
            fontSize: 14,
          }}>
            Failed to load scores: {error}
          </div>
        )}

        {!loading && !error && scores.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '60px 0',
            color: '#8892a4',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>&#128274;</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: '#e2e8f0' }}>No solves yet</div>
            <div style={{ fontSize: 13 }}>Be the first to capture a flag.</div>
          </div>
        )}

        {!loading && scores.length > 0 && (
          <>
            {/* Top 3 podium */}
            {scores.length >= 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-end',
                gap: 16,
                marginBottom: 36,
              }}>
                {/* Render 2nd, 1st, 3rd in podium order */}
                {[scores[1], scores[0], scores[2]].map((row, podiumIdx) => {
                  if (!row) return <div key={podiumIdx} style={{ width: 160 }} />
                  const actualRank = row.rank
                  const rs = RANK_STYLES[actualRank]
                  const heights = [120, 160, 100]
                  return (
                    <div key={row.rank} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: 160 }}>
                      <div style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: rs.badge.includes('#ffd700') ? '#ffd700' : rs.badge.includes('#c0c0c0') ? '#c0c0c0' : '#cd7f32',
                        letterSpacing: '0.05em',
                        textAlign: 'center',
                        maxWidth: 140,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>{row.name}</div>
                      <div style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color: '#22c55e',
                      }}>{row.score.toLocaleString()}</div>
                      <div style={{
                        width: '100%',
                        height: heights[podiumIdx],
                        background: '#13161f',
                        border: `2px solid ${rs.border}`,
                        borderRadius: '8px 8px 0 0',
                        boxShadow: rs.glow,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                      }}>
                        <div style={{
                          width: 32, height: 32,
                          borderRadius: '50%',
                          background: rs.badge,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 13,
                          fontWeight: 800,
                          color: '#0b0e14',
                        }}>{actualRank}</div>
                        {row.solves != null && (
                          <div style={{ fontSize: 11, color: '#8892a4' }}>{row.solves} solve{row.solves !== 1 ? 's' : ''}</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Full table */}
            <div style={{
              background: '#13161f',
              border: '1px solid #252b3a',
              borderRadius: 10,
              overflow: 'hidden',
            }}>
              {/* Table header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: `48px 1fr 90px ${showCategories ? categories.map(() => '72px').join(' ') + ' ' : ''}80px 100px`,
                padding: '10px 16px',
                borderBottom: '1px solid #252b3a',
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#8892a4',
                gap: 8,
              }}>
                <span>#</span>
                <span>Player</span>
                <span style={{ textAlign: 'right' }}>Score</span>
                {showCategories && categories.map(cat => (
                  <span key={cat} style={{ textAlign: 'right', textTransform: 'capitalize' }}>{cat}</span>
                ))}
                <span style={{ textAlign: 'right' }}>Solves</span>
                <span style={{ textAlign: 'right' }}>Last Solve</span>
              </div>

              {scores.map((row, idx) => {
                const rs = RANK_STYLES[row.rank]
                return (
                  <div
                    key={row.rank}
                    className="score-row"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `48px 1fr 90px ${showCategories ? categories.map(() => '72px').join(' ') + ' ' : ''}80px 100px`,
                      padding: '12px 16px',
                      borderBottom: idx < scores.length - 1 ? '1px solid #1a1f2c' : 'none',
                      alignItems: 'center',
                      gap: 8,
                      background: rs ? '#0f1319' : '#13161f',
                      transition: 'background 0.15s',
                      cursor: 'default',
                    }}
                  >
                    <span style={{
                      fontWeight: 700,
                      fontSize: 14,
                      color: rs
                        ? (row.rank === 1 ? '#ffd700' : row.rank === 2 ? '#c0c0c0' : '#cd7f32')
                        : '#8892a4',
                    }}>
                      {String(row.rank).padStart(2, '0')}
                    </span>

                    <span style={{
                      fontSize: 14,
                      fontWeight: row.rank <= 3 ? 600 : 400,
                      color: '#e2e8f0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {row.name}
                    </span>

                    <span style={{
                      textAlign: 'right',
                      fontWeight: 700,
                      fontSize: 15,
                      color: '#22c55e',
                    }}>
                      {row.score.toLocaleString()}
                    </span>

                    {showCategories && categories.map(cat => (
                      <span key={cat} style={{
                        textAlign: 'right',
                        fontSize: 12,
                        color: row.categories?.[cat] ? '#38bdf8' : '#2a3040',
                        fontWeight: row.categories?.[cat] ? 600 : 400,
                      }}>
                        {row.categories?.[cat] ? row.categories[cat].toLocaleString() : '-'}
                      </span>
                    ))}

                    <span style={{
                      textAlign: 'right',
                      fontSize: 13,
                      color: '#8892a4',
                    }}>
                      {row.solves != null ? row.solves : '-'}
                    </span>

                    <span style={{
                      textAlign: 'right',
                      fontSize: 11,
                      color: '#8892a4',
                    }}>
                      {formatTime(row.last_solve_at)}
                    </span>
                  </div>
                )
              })}
            </div>

            <div style={{ marginTop: 12, textAlign: 'right', fontSize: 11, color: '#4a5568' }}>
              Auto-refreshes every 30 seconds
            </div>
          </>
        )}
      </div>
    </div>
  )
}

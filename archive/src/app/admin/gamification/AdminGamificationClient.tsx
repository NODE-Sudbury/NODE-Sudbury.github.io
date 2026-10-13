'use client'

import { useState, useCallback } from 'react'
import type { BadgeDef } from '@/lib/badges'

type Member = { id: string; full_name: string; avatar_url: string | null }

type LeaderboardEntry = {
  member_id: string
  full_name: string
  total_points: number
  badge_count: number
  badges: { badge_slug: string; badge_name: string }[]
}

type RecentAward = {
  id: string
  member_id: string
  member_name: string
  points: number
  reason: string
  source_type: string
  created_at: string
}

type Props = {
  members: Member[]
  leaderboard: LeaderboardEntry[]
  recentAwards: RecentAward[]
  badgeDefinitions: BadgeDef[]
}

const BADGE_COLOR_MAP: Record<string, string> = {
  first_event:      '#38bdf8',
  first_speaker:    '#a78bfa',
  hackathon_winner: '#f59e0b',
  volunteer:        '#34d399',
  streak_5:         '#fb923c',
  norcat_alumni:    '#f472b6',
}

function badgeColor(slug: string): string {
  return BADGE_COLOR_MAP[slug] ?? '#8892a4'
}

const inputCls = 'w-full rounded-md border border-[#252b3a] bg-[#0d1117] px-3 py-2 text-sm text-white placeholder:text-[#4a5568] focus:outline-none focus:ring-1 focus:ring-[#38bdf8]'
const labelCls = 'block text-xs font-medium text-[#8892a4] mb-1'

function BadgePill({ slug, name }: { slug: string; name: string }) {
  const color = badgeColor(slug)
  return (
    <span style={{
      display: 'inline-block', padding: '2px 7px', borderRadius: 999, fontSize: 11,
      fontWeight: 600, color, background: color + '22', border: `1px solid ${color}44`,
      marginRight: 4, whiteSpace: 'nowrap',
    }}>
      {name}
    </span>
  )
}

export default function AdminGamificationClient({ members, leaderboard: initialLeaderboard, recentAwards: initialAwards, badgeDefinitions }: Props) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(initialLeaderboard)
  const [awards, setAwards] = useState<RecentAward[]>(initialAwards)

  // Form state
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [search, setSearch] = useState('')
  const [points, setPoints] = useState('')
  const [reason, setReason] = useState('')
  const [badgeSlug, setBadgeSlug] = useState('')
  const [badgeName, setBadgeName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  const filteredMembers = search.trim()
    ? members.filter((m) =>
        m.full_name?.toLowerCase().includes(search.toLowerCase())
      )
    : members

  const selectedMember = members.find((m) => m.id === selectedMemberId)

  const handleAward = useCallback(async () => {
    if (!selectedMemberId || !points || !reason.trim()) {
      setFeedback({ ok: false, msg: 'Member, points, and reason are required.' })
      return
    }
    const pointsNum = parseInt(points, 10)
    if (isNaN(pointsNum) || pointsNum === 0) {
      setFeedback({ ok: false, msg: 'Points must be a non-zero integer.' })
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const body: Record<string, unknown> = {
        member_id: selectedMemberId,
        points: pointsNum,
        reason: reason.trim(),
      }
      if (badgeSlug.trim()) {
        body.badge_slug = badgeSlug.trim()
        body.badge_name = badgeName.trim() || badgeSlug.trim()
      }

      const res = await fetch('/api/gamification/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const json = await res.json()

      if (!res.ok) {
        setFeedback({ ok: false, msg: json.error ?? 'Failed to award.' })
        return
      }

      setFeedback({ ok: true, msg: `Awarded ${pointsNum > 0 ? '+' : ''}${pointsNum} pts to ${selectedMember?.full_name ?? selectedMemberId}.` })

      // Optimistic update on recent awards list
      const newAward: RecentAward = {
        id: Math.random().toString(36).slice(2),
        member_id: selectedMemberId,
        member_name: selectedMember?.full_name ?? selectedMemberId,
        points: pointsNum,
        reason: reason.trim(),
        source_type: 'manual',
        created_at: new Date().toISOString(),
      }
      setAwards((prev) => [newAward, ...prev].slice(0, 20))

      // Update leaderboard entry
      setLeaderboard((prev) => {
        const existing = prev.find((e) => e.member_id === selectedMemberId)
        if (existing) {
          return prev
            .map((e) => e.member_id === selectedMemberId
              ? {
                  ...e,
                  total_points: json.total_points ?? e.total_points + pointsNum,
                  badge_count: json.badges?.length ?? e.badge_count,
                  badges: json.badges?.map((b: { badge_slug: string; badge_name: string }) => ({
                    badge_slug: b.badge_slug,
                    badge_name: b.badge_name,
                  })) ?? e.badges,
                }
              : e
            )
            .sort((a, b) => b.total_points - a.total_points)
        } else {
          return [
            {
              member_id: selectedMemberId,
              full_name: selectedMember?.full_name ?? selectedMemberId,
              total_points: json.total_points ?? pointsNum,
              badge_count: json.badges?.length ?? 0,
              badges: json.badges ?? [],
            },
            ...prev,
          ].sort((a, b) => b.total_points - a.total_points)
        }
      })

      // Reset form
      setPoints('')
      setReason('')
      setBadgeSlug('')
      setBadgeName('')
    } finally {
      setSubmitting(false)
    }
  }, [selectedMemberId, points, reason, badgeSlug, badgeName, selectedMember])

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 16px' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 800 }}>Gamification</h1>
        <p style={{ margin: '0 0 32px', color: '#8892a4', fontSize: 14 }}>Award points and badges to community members.</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 24, alignItems: 'start' }}>

          {/* Award form */}
          <div style={{ background: '#13161f', border: '1px solid #252b3a', borderRadius: 12, padding: 24 }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>Award Points or Badge</h2>

            <div style={{ marginBottom: 16 }}>
              <label className={labelCls} style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8892a4', marginBottom: 4 }}>
                Search member
              </label>
              <input
                className={inputCls}
                style={{ width: '100%', borderRadius: 6, border: '1px solid #252b3a', background: '#0d1117', padding: '8px 12px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' }}
                placeholder="Type to search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <div style={{ background: '#0d1117', border: '1px solid #252b3a', borderRadius: 6, marginTop: 4, maxHeight: 200, overflowY: 'auto' }}>
                  {filteredMembers.length === 0 && (
                    <div style={{ padding: '8px 12px', color: '#8892a4', fontSize: 13 }}>No members found.</div>
                  )}
                  {filteredMembers.slice(0, 20).map((m) => (
                    <div
                      key={m.id}
                      onClick={() => { setSelectedMemberId(m.id); setSearch('') }}
                      style={{
                        padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                        background: selectedMemberId === m.id ? '#1e2535' : 'transparent',
                        color: '#e2e8f0',
                        borderBottom: '1px solid #1a1f2e',
                      }}
                    >
                      {m.full_name}
                    </div>
                  ))}
                </div>
              )}
              {selectedMember && !search && (
                <div style={{ marginTop: 8, padding: '6px 10px', background: '#1e2535', borderRadius: 6, fontSize: 13, color: '#38bdf8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{selectedMember.full_name}</span>
                  <button onClick={() => setSelectedMemberId('')} style={{ background: 'none', border: 'none', color: '#8892a4', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>x</button>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8892a4', marginBottom: 4 }}>Points</label>
                <input
                  type="number"
                  style={{ width: '100%', borderRadius: 6, border: '1px solid #252b3a', background: '#0d1117', padding: '8px 12px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' }}
                  placeholder="e.g. 50"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8892a4', marginBottom: 4 }}>Reason</label>
                <input
                  style={{ width: '100%', borderRadius: 6, border: '1px solid #252b3a', background: '#0d1117', padding: '8px 12px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' }}
                  placeholder="e.g. Attended AI Night"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </div>

            <div style={{ background: '#0d1117', border: '1px solid #1a1f2e', borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#8892a4', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Badge (optional)</div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8892a4', marginBottom: 4 }}>Badge slug</label>
                <select
                  style={{ width: '100%', borderRadius: 6, border: '1px solid #252b3a', background: '#0d1117', padding: '8px 12px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' }}
                  value={badgeSlug}
                  onChange={(e) => {
                    setBadgeSlug(e.target.value)
                    const def = badgeDefinitions.find((b) => b.slug === e.target.value)
                    if (def) setBadgeName(def.name)
                  }}
                >
                  <option value="">None</option>
                  {badgeDefinitions.map((b) => (
                    <option key={b.slug} value={b.slug}>{b.name} ({b.slug})</option>
                  ))}
                </select>
              </div>
              {badgeSlug && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8892a4', marginBottom: 4 }}>Badge display name</label>
                  <input
                    style={{ width: '100%', borderRadius: 6, border: '1px solid #252b3a', background: '#0d1117', padding: '8px 12px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' }}
                    value={badgeName}
                    onChange={(e) => setBadgeName(e.target.value)}
                  />
                </div>
              )}
            </div>

            {feedback && (
              <div style={{
                marginBottom: 14,
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 13,
                background: feedback.ok ? '#052e16' : '#2d0f0f',
                border: `1px solid ${feedback.ok ? '#16a34a' : '#7f1d1d'}`,
                color: feedback.ok ? '#4ade80' : '#f87171',
              }}>
                {feedback.msg}
              </div>
            )}

            <button
              onClick={handleAward}
              disabled={submitting}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 8,
                background: submitting ? '#1e3a4a' : '#38bdf8',
                color: submitting ? '#8892a4' : '#000',
                border: 'none',
                fontSize: 14,
                fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Awarding...' : 'Award'}
            </button>
          </div>

          {/* Right side: leaderboard + recent awards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Mini leaderboard */}
            <div style={{ background: '#13161f', border: '1px solid #252b3a', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #252b3a' }}>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Leaderboard (top 50)</h2>
              </div>
              <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {leaderboard.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#8892a4', fontSize: 13 }}>No data yet.</td>
                      </tr>
                    )}
                    {leaderboard.map((entry, i) => (
                      <tr key={entry.member_id} style={{ borderBottom: '1px solid #1a1f2e' }}>
                        <td style={{ padding: '10px 14px', width: 36, color: '#8892a4', fontSize: 13, fontWeight: 600 }}>
                          #{i + 1}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 13 }}>{entry.full_name}</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginTop: 2 }}>
                            {entry.badges.slice(0, 3).map((b) => (
                              <BadgePill key={b.badge_slug} slug={b.badge_slug} name={b.badge_name} />
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <span style={{ color: '#38bdf8', fontWeight: 700 }}>{entry.total_points.toLocaleString()}</span>
                          <span style={{ color: '#8892a4', fontSize: 11, marginLeft: 3 }}>pts</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent awards log */}
            <div style={{ background: '#13161f', border: '1px solid #252b3a', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #252b3a' }}>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Recent Awards</h2>
              </div>
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {awards.length === 0 && (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#8892a4', fontSize: 13 }}>No awards yet.</div>
                )}
                {awards.map((a) => (
                  <div key={a.id} style={{ padding: '12px 20px', borderBottom: '1px solid #1a1f2e', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 13 }}>{a.member_name}</div>
                      <div style={{ color: '#8892a4', fontSize: 12, marginTop: 2 }}>{a.reason}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ color: a.points >= 0 ? '#4ade80' : '#f87171', fontWeight: 700, fontSize: 13 }}>
                        {a.points >= 0 ? '+' : ''}{a.points} pts
                      </div>
                      <div style={{ color: '#4a5568', fontSize: 11, marginTop: 2 }}>{formatDate(a.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch {
      return iso
    }
  }
}

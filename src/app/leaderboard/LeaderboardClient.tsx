'use client'

import { useState, useCallback } from 'react'
import type { BadgeDef } from '@/lib/badges'

type LeaderboardEntry = {
  member_id: string
  full_name: string
  avatar_url: string | null
  total_points: number
  badge_count: number
  badges: { badge_slug: string; badge_name: string }[]
}

type Props = {
  initialLeaderboard: LeaderboardEntry[]
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

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) return <span style={{ color: '#f59e0b', fontSize: 20 }}>&#9651;</span>
  if (rank === 2) return <span style={{ color: '#9ca3af', fontSize: 20 }}>&#9651;</span>
  if (rank === 3) return <span style={{ color: '#92400e', fontSize: 20 }}>&#9651;</span>
  return <span style={{ color: '#4a5568', fontWeight: 600, fontSize: 14 }}>#{rank}</span>
}

function Avatar({ name, url, size = 40 }: { name: string; url: string | null; size?: number }) {
  const [err, setErr] = useState(false)
  if (url && !err) {
    return (
      <img
        src={url}
        alt={name}
        onError={() => setErr(true)}
        style={{
          width: size, height: size, borderRadius: '50%', objectFit: 'cover',
          flexShrink: 0,
        }}
      />
    )
  }
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%', background: '#1e2535',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.38, fontWeight: 700, color: '#38bdf8', flexShrink: 0,
        border: '1px solid #252b3a',
      }}
    >
      {initials(name)}
    </div>
  )
}

function BadgePill({ slug, name }: { slug: string; name: string }) {
  const color = badgeColor(slug)
  return (
    <span
      title={name}
      style={{
        display: 'inline-block',
        padding: '2px 7px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        color: color,
        background: color + '22',
        border: `1px solid ${color}44`,
        marginRight: 4,
        marginBottom: 4,
        whiteSpace: 'nowrap',
      }}
    >
      {name}
    </span>
  )
}

function PodiumCard({
  entry,
  rank,
}: {
  entry: LeaderboardEntry
  rank: number
}) {
  const ringColor = rank === 1 ? '#f59e0b' : rank === 2 ? '#9ca3af' : '#92400e'
  const label = rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd'
  return (
    <div
      style={{
        background: '#13161f',
        border: `2px solid ${ringColor}`,
        borderRadius: 12,
        padding: '24px 20px',
        textAlign: 'center',
        flex: 1,
        minWidth: 160,
        maxWidth: 260,
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', top: 12, left: 14, color: ringColor, fontWeight: 800, fontSize: 18 }}>
        {label}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <Avatar name={entry.full_name} url={entry.avatar_url} size={56} />
      </div>
      <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 15, marginBottom: 4 }}>
        {entry.full_name}
      </div>
      <div style={{ color: '#38bdf8', fontWeight: 800, fontSize: 22, marginBottom: 8 }}>
        {entry.total_points.toLocaleString()}
        <span style={{ fontSize: 13, fontWeight: 500, color: '#8892a4', marginLeft: 4 }}>pts</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2 }}>
        {entry.badges.slice(0, 3).map((b) => (
          <BadgePill key={b.badge_slug} slug={b.badge_slug} name={b.badge_name} />
        ))}
        {entry.badges.length > 3 && (
          <span style={{ fontSize: 11, color: '#8892a4' }}>+{entry.badges.length - 3} more</span>
        )}
      </div>
    </div>
  )
}

export default function LeaderboardClient({ initialLeaderboard, badgeDefinitions }: Props) {
  const [period, setPeriod] = useState<'alltime' | 'month'>('alltime')
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(initialLeaderboard)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async (p: 'alltime' | 'month') => {
    setLoading(true)
    try {
      const url = p === 'month'
        ? '/api/gamification/leaderboard?period=month'
        : '/api/gamification/leaderboard'
      const res = await fetch(url, { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        // API doesn't return per-member badges list, so we keep badge_count only
        setLeaderboard(
          (json.leaderboard ?? []).map((e: any) => ({
            ...e,
            badges: e.badges ?? [],
          }))
        )
      }
    } finally {
      setLoading(false)
    }
  }, [])

  async function switchPeriod(p: 'alltime' | 'month') {
    setPeriod(p)
    await refresh(p)
  }

  const top3 = leaderboard.slice(0, 3)
  const rest = leaderboard.slice(3)

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 16px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#e2e8f0' }}>Community Leaderboard</h1>
            <p style={{ margin: '6px 0 0', color: '#8892a4', fontSize: 14 }}>Top NODE Sudbury contributors by points earned.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Period toggle */}
            <div style={{ display: 'flex', background: '#13161f', border: '1px solid #252b3a', borderRadius: 8, overflow: 'hidden' }}>
              {(['alltime', 'month'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => switchPeriod(p)}
                  style={{
                    padding: '6px 14px',
                    fontSize: 13,
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: period === p ? '#38bdf8' : 'transparent',
                    color: period === p ? '#000' : '#8892a4',
                    transition: 'all 0.15s',
                  }}
                >
                  {p === 'alltime' ? 'All time' : 'This month'}
                </button>
              ))}
            </div>
            <button
              onClick={() => refresh(period)}
              disabled={loading}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: '1px solid #252b3a',
                background: 'transparent',
                color: loading ? '#4a5568' : '#8892a4',
                fontSize: 13,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {leaderboard.length === 0 && !loading && (
          <div style={{ textAlign: 'center', color: '#8892a4', padding: '60px 0' }}>
            No points recorded yet. Attend events to earn points!
          </div>
        )}

        {/* Podium - top 3 */}
        {top3.length > 0 && (
          <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
            {top3.map((entry, i) => (
              <PodiumCard key={entry.member_id} entry={entry} rank={i + 1} />
            ))}
          </div>
        )}

        {/* Rest of the table */}
        {rest.length > 0 && (
          <div style={{ background: '#13161f', border: '1px solid #252b3a', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #252b3a' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#8892a4', textTransform: 'uppercase', letterSpacing: '0.05em', width: 56 }}>#</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#8892a4', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Member</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: '#8892a4', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Points</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#8892a4', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Badges</th>
                </tr>
              </thead>
              <tbody>
                {rest.map((entry, i) => {
                  const rank = i + 4
                  return (
                    <tr
                      key={entry.member_id}
                      style={{ borderBottom: '1px solid #1a1f2e' }}
                    >
                      <td style={{ padding: '12px 16px', width: 56 }}>
                        <RankMedal rank={rank} />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={entry.full_name} url={entry.avatar_url} size={32} />
                          <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 14 }}>{entry.full_name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <span style={{ color: '#38bdf8', fontWeight: 700, fontSize: 15 }}>
                          {entry.total_points.toLocaleString()}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                          {entry.badges.length > 0
                            ? entry.badges.slice(0, 4).map((b) => (
                                <BadgePill key={b.badge_slug} slug={b.badge_slug} name={b.badge_name} />
                              ))
                            : entry.badge_count > 0
                              ? <span style={{ fontSize: 12, color: '#8892a4' }}>{entry.badge_count} badge{entry.badge_count !== 1 ? 's' : ''}</span>
                              : <span style={{ fontSize: 12, color: '#4a5568' }}>None</span>
                          }
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Badge legend */}
        <div style={{ marginTop: 32, background: '#13161f', border: '1px solid #252b3a', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#8892a4', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Badge Types</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {badgeDefinitions.map((b) => (
              <BadgePill key={b.slug} slug={b.slug} name={b.name} />
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

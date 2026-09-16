'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface LFTTeam {
  id: string
  name: string
  description: string | null
  max_size: number
  is_open: boolean
  looking_for_members: boolean
  lft_note: string | null
  member_count: number
}

interface Props {
  event: { id: string; title: string }
  teams: LFTTeam[]
  myTeam: { id: string; name: string } | null
}

type FilterTab = 'all' | 'open'

export default function TeamFinderClient({ event, teams, myTeam }: Props) {
  const [tab, setTab] = useState<FilterTab>('open')
  const [submitting, setSubmitting] = useState<string | null>(null) // teamId being requested
  const [joined, setJoined] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const filtered = tab === 'open'
    ? teams.filter(t => t.looking_for_members && t.is_open && t.member_count < t.max_size)
    : teams

  async function requestJoin(teamId: string) {
    setError(null)
    setSuccess(null)
    setSubmitting(teamId)
    try {
      const res = await fetch(`/api/hackathon/teams/${teamId}/join-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to send join request')
      } else {
        setJoined(prev => new Set(prev).add(teamId))
        setSuccess('Request sent - you have joined the team!')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0e14] text-[#c9d1e8]">
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Back link + header */}
        <div className="mb-8">
          <a
            href={`/hackathon/${event.id}`}
            className="text-xs font-mono text-[#5a6278] hover:text-[#c9d1e8] transition-colors uppercase tracking-widest mb-3 inline-block"
          >
            &larr; Back to {event.title}
          </a>
          <h1 className="text-2xl font-semibold text-white">Find a Team</h1>
          <p className="text-sm text-[#5a6278] mt-1">Browse teams looking for members and request to join.</p>
        </div>

        {/* Already-on-team notice */}
        {myTeam && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-[#38bdf8]/10 border border-[#38bdf8]/30 text-sm text-[#38bdf8]">
            You are already on team{' '}
            <a href={`/hackathon/${event.id}`} className="font-semibold underline underline-offset-2 hover:opacity-80">
              {myTeam.name}
            </a>
            . You can browse listings, but joining another team requires leaving your current one.
          </div>
        )}

        {/* Feedback banners */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-[#f7768e]/10 border border-[#f7768e]/30 text-[#f7768e] text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-[#9ece6a]/10 border border-[#9ece6a]/30 text-[#9ece6a] text-sm">
            {success}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('open')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === 'open'
                ? 'bg-[#f0e6d3] text-[#0b0e14]'
                : 'bg-[#13161f] border border-[#252b3a] text-[#c9d1e8] hover:bg-[#252b3a]'
            }`}
          >
            Open Spots ({teams.filter(t => t.looking_for_members && t.is_open && t.member_count < t.max_size).length})
          </button>
          <button
            onClick={() => setTab('all')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === 'all'
                ? 'bg-[#f0e6d3] text-[#0b0e14]'
                : 'bg-[#13161f] border border-[#252b3a] text-[#c9d1e8] hover:bg-[#252b3a]'
            }`}
          >
            All Teams ({teams.length})
          </button>
        </div>

        {/* Team list */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-[#5a6278] text-sm">
            {tab === 'open'
              ? 'No teams are currently looking for members.'
              : 'No teams have been created yet.'}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(team => {
              const spotsLeft = team.max_size - team.member_count
              const full = spotsLeft <= 0
              const alreadyJoined = joined.has(team.id)
              const isMyTeam = myTeam?.id === team.id

              return (
                <Card key={team.id} className="bg-[#13161f] border-[#252b3a]">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm text-white">{team.name}</p>
                          {isMyTeam && (
                            <Badge variant="outline" className="text-[10px] text-[#f0e6d3] border-[#f0e6d3]/30">
                              Your team
                            </Badge>
                          )}
                          {full ? (
                            <Badge variant="outline" className="text-[10px] text-[#f7768e] border-[#f7768e]/40">
                              Full
                            </Badge>
                          ) : team.looking_for_members ? (
                            <Badge variant="outline" className="text-[10px] text-[#9ece6a] border-[#9ece6a]/40">
                              LFM
                            </Badge>
                          ) : null}
                        </div>

                        {team.description && (
                          <p className="text-xs text-[#5a6278] mt-1">{team.description}</p>
                        )}

                        {team.lft_note && (
                          <p className="text-xs text-[#c9d1e8]/70 mt-1.5 italic">
                            &quot;{team.lft_note}&quot;
                          </p>
                        )}

                        <p className="text-xs text-[#5a6278] mt-2">
                          {team.member_count}/{team.max_size} members
                          {!full && (
                            <span className="ml-1 text-[#9ece6a]">
                              ({spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} open)
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="shrink-0">
                        {isMyTeam ? (
                          <span className="text-xs text-[#5a6278]">Your team</span>
                        ) : alreadyJoined ? (
                          <span className="text-xs text-[#9ece6a] font-medium">Joined!</span>
                        ) : (
                          <Button
                            size="sm"
                            disabled={full || submitting === team.id || Boolean(myTeam && !isMyTeam)}
                            onClick={() => requestJoin(team.id)}
                            className={
                              full
                                ? 'border-[#252b3a] text-[#5a6278] cursor-not-allowed bg-transparent'
                                : 'bg-[#f0e6d3] text-[#0b0e14] hover:bg-[#f0e6d3]/90'
                            }
                          >
                            {submitting === team.id
                              ? 'Joining...'
                              : full
                              ? 'Full'
                              : myTeam
                              ? 'Leave your team first'
                              : 'Request to Join'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

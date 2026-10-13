'use client'

import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import HackathonCountdown from '@/components/HackathonCountdown'

interface TeamMember {
  id: string
  member_id: string
  role: string
  members: { full_name: string | null; avatar_url: string | null } | null
}

interface Team {
  id: string
  name: string
  description: string | null
  max_size: number
  is_open: boolean
  created_by: string
  looking_for_members?: boolean
  lft_note?: string | null
  hackathon_team_members: TeamMember[]
}

interface Props {
  event: {
    id: string
    title: string
    slug: string
    type: string
    starts_at: string
    ends_at: string
    hackathon_kickoff_at: string | null
    hackathon_hacking_starts_at: string | null
    hackathon_teams_lock_at: string | null
    hackathon_submission_deadline: string | null
    hackathon_judging_starts_at: string | null
    hackathon_results_announced_at: string | null
  }
  allTeams: Team[]
}

export default function HackathonClient({ event, allTeams: initialTeams }: Props) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [memberId, setMemberId] = useState<string | null>(null)
  const [teams, setTeams] = useState<Team[]>(initialTeams)
  const [myTeam, setMyTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'browse' | 'create'>('browse')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({ name: '', description: '', max_size: '6', is_open: true })
  const [lftToggling, setLftToggling] = useState(false)
  const [lftError, setLftError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      const uid = data.session.user.id
      setMemberId(uid)
      const found = initialTeams.find(t => t.hackathon_team_members.some(m => m.member_id === uid))
      setMyTeam(found ?? null)
      setLoading(false)
    })
  }, [])

  async function createTeam() {
    setSubmitting(true); setError(null)
    const res = await fetch('/api/hackathon/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: event.id, name: form.name, description: form.description, max_size: parseInt(form.max_size), is_open: form.is_open }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to create team'); setSubmitting(false); return }
    setMyTeam(data.team)
    setTeams(prev => [...prev, data.team])
    setSuccess('Team created!')
    setSubmitting(false)
  }

  async function joinTeam(teamId: string) {
    setSubmitting(true); setError(null)
    const res = await fetch(`/api/hackathon/teams/${teamId}/join`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to join team'); setSubmitting(false); return }
    window.location.reload()
  }

  async function toggleLookingForMembers() {
    if (!myTeam) return
    setLftToggling(true)
    setLftError(null)
    const newVal = !myTeam.looking_for_members
    const res = await fetch(`/api/hackathon/teams/${myTeam.id}/join-request`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ looking_for_members: newVal }),
    })
    const data = await res.json()
    if (!res.ok) {
      setLftError(data.error ?? 'Failed to update LFM setting')
    } else {
      setMyTeam(prev => prev ? { ...prev, looking_for_members: newVal } : prev)
      setTeams(prev => prev.map(t => t.id === myTeam.id ? { ...t, looking_for_members: newVal } : t))
    }
    setLftToggling(false)
  }

  async function leaveTeam() {
    if (!myTeam) return
    setSubmitting(true); setError(null)
    const res = await fetch(`/api/hackathon/teams/${myTeam.id}/leave`, { method: 'POST' })
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed to leave team'); setSubmitting(false); return }
    setMyTeam(null)
    setTeams(prev => prev.filter(t => t.id !== myTeam.id))
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-[#f0e6d3] border-t-transparent animate-spin" />
      </div>
    )
  }

  const isCaptain = myTeam?.created_by === memberId

  return (
    <div className="min-h-screen bg-[#0b0e14] text-[#c9d1e8]">
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-mono text-[#5a6278] mb-1 uppercase tracking-widest">Hackathon</p>
          <h1 className="text-2xl font-semibold text-white">{event.title}</h1>
          {event.hackathon_teams_lock_at && (
            <p className="text-sm text-[#5a6278] mt-1">
              Teams lock: {new Date(event.hackathon_teams_lock_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
          <div className="flex gap-3 mt-3 flex-wrap">
            <a
              href={`/hackathon/${event.id}/bracket`}
              className="text-xs text-[#38bdf8] border border-[#38bdf8]/30 hover:bg-[#38bdf8]/10 px-3 py-1.5 rounded-lg transition-colors"
            >
              View Bracket
            </a>
            <a
              href={`/hackathon/${event.id}/team-finder`}
              className="text-xs text-[#f0e6d3] border border-[#f0e6d3]/30 hover:bg-[#f0e6d3]/10 px-3 py-1.5 rounded-lg transition-colors"
            >
              Find a Team (LFT)
            </a>
          </div>
        </div>

        {event.type === 'hackathon' && (
          <HackathonCountdown
            kickoffAt={event.hackathon_kickoff_at}
            hackingStartsAt={event.hackathon_hacking_starts_at}
            teamsLockAt={event.hackathon_teams_lock_at}
            submissionDeadline={event.hackathon_submission_deadline}
            judgingStartsAt={event.hackathon_judging_starts_at}
            resultsAt={event.hackathon_results_announced_at}
            eventStartsAt={event.starts_at}
          />
        )}

        {error && <div className="mb-4 px-4 py-3 rounded-lg bg-[#f7768e]/10 border border-[#f7768e]/30 text-[#f7768e] text-sm">{error}</div>}
        {success && <div className="mb-4 px-4 py-3 rounded-lg bg-[#9ece6a]/10 border border-[#9ece6a]/30 text-[#9ece6a] text-sm">{success}</div>}

        {myTeam ? (
          /* ---- Has a team ---- */
          <div className="space-y-6">
            <Card className="bg-[#13161f] border-[#252b3a]">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">{myTeam.name}</h2>
                    {myTeam.description && <p className="text-sm text-[#5a6278] mt-1">{myTeam.description}</p>}
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {myTeam.hackathon_team_members.length}/{myTeam.max_size} members
                  </Badge>
                </div>

                <Separator className="mb-4 bg-[#252b3a]" />

                <div className="space-y-2 mb-6">
                  {myTeam.hackathon_team_members.map(m => (
                    <div key={m.id} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#252b3a] flex items-center justify-center text-xs font-medium text-[#f0e6d3]">
                        {m.members?.full_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <span className="text-sm">{m.members?.full_name ?? 'Unknown'}</span>
                      {m.role === 'captain' && <Badge variant="outline" className="text-[10px] py-0">captain</Badge>}
                    </div>
                  ))}
                </div>

                {/* Looking for members toggle - captain only */}
                {isCaptain && (
                  <div className="mb-4 p-3 rounded-lg bg-[#0b0e14] border border-[#252b3a]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#c9d1e8]">Looking for members</p>
                        <p className="text-xs text-[#5a6278] mt-0.5">
                          Let others find your team on the{' '}
                          <a href={`/hackathon/${event.id}/team-finder`} className="text-[#38bdf8] hover:underline">
                            team finder
                          </a>
                          {' '}page.
                        </p>
                      </div>
                      <button
                        onClick={toggleLookingForMembers}
                        disabled={lftToggling}
                        aria-pressed={Boolean(myTeam.looking_for_members)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#f0e6d3]/50 ${
                          myTeam.looking_for_members ? 'bg-[#9ece6a]' : 'bg-[#252b3a]'
                        } ${lftToggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            myTeam.looking_for_members ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    {lftError && (
                      <p className="text-xs text-[#f7768e] mt-2">{lftError}</p>
                    )}
                  </div>
                )}

                <div className="flex gap-3 flex-wrap">
                  <a
                    href={`/hackathon/${event.id}/submit`}
                    className="inline-flex items-center px-4 py-2 rounded-md bg-[#f0e6d3] text-[#0b0e14] text-sm font-medium hover:bg-[#f0e6d3]/90 transition-colors"
                  >
                    Submit Project
                  </a>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={leaveTeam}
                    disabled={submitting}
                  >
                    {isCaptain && myTeam.hackathon_team_members.length === 1 ? 'Disband Team' : 'Leave Team'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* ---- No team ---- */
          <div className="space-y-8">
            {/* Toggle */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={view === 'browse' ? 'secondary' : 'outline'}
                onClick={() => setView('browse')}
              >
                Join a Team ({teams.filter(t => t.is_open && t.hackathon_team_members.length < t.max_size).length} open)
              </Button>
              <Button
                size="sm"
                variant={view === 'create' ? 'secondary' : 'outline'}
                onClick={() => setView('create')}
              >
                Create a Team
              </Button>
            </div>

            {view === 'create' ? (
              <Card className="bg-[#13161f] border-[#252b3a]">
                <CardContent className="p-6 space-y-4">
                  <h2 className="text-base font-semibold text-white">Create your team</h2>
                  <div className="space-y-1">
                    <Label className="text-xs text-[#5a6278]">Team name *</Label>
                    <Input
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Sudo Make Me a Sandwich"
                      className="bg-[#0b0e14] border-[#252b3a] text-[#c9d1e8]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-[#5a6278]">Description</Label>
                    <Input
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="What are you building? Looking for what skills?"
                      className="bg-[#0b0e14] border-[#252b3a] text-[#c9d1e8]"
                    />
                  </div>
                  <div className="flex gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-[#5a6278]">Max size</Label>
                      <select
                        value={form.max_size}
                        onChange={e => setForm(f => ({ ...f, max_size: e.target.value }))}
                        className="block w-24 px-3 py-2 rounded-md bg-[#0b0e14] border border-[#252b3a] text-sm text-[#c9d1e8]"
                      >
                        {[2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-[#5a6278]">Open to join?</Label>
                      <div className="flex items-center gap-2 h-10">
                        <input
                          type="checkbox"
                          checked={form.is_open}
                          onChange={e => setForm(f => ({ ...f, is_open: e.target.checked }))}
                          className="w-4 h-4 accent-[#f0e6d3]"
                        />
                        <span className="text-sm">{form.is_open ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={createTeam}
                    disabled={submitting || !form.name.trim()}
                    className="bg-[#f0e6d3] text-[#0b0e14] hover:bg-[#f0e6d3]/90"
                  >
                    {submitting ? 'Creating...' : 'Create Team'}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {teams.filter(t => t.is_open).length === 0 ? (
                  <p className="text-sm text-[#5a6278] text-center py-8">No open teams yet. Be the first to create one!</p>
                ) : (
                  teams.filter(t => t.is_open).map(team => {
                    const count = team.hackathon_team_members.length
                    const full = count >= team.max_size
                    return (
                      <Card key={team.id} className="bg-[#13161f] border-[#252b3a]">
                        <CardContent className="p-4 flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm text-white truncate">{team.name}</p>
                              {full && <Badge variant="outline" className="text-[10px] text-[#f7768e] border-[#f7768e]/40">Full</Badge>}
                            </div>
                            {team.description && <p className="text-xs text-[#5a6278] mt-0.5 truncate">{team.description}</p>}
                            <p className="text-xs text-[#5a6278] mt-1">{count}/{team.max_size} members</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={full || submitting}
                            onClick={() => joinTeam(team.id)}
                            className="shrink-0 border-[#252b3a] text-[#c9d1e8] hover:bg-[#252b3a]"
                          >
                            {full ? 'Full' : 'Join'}
                          </Button>
                        </CardContent>
                      </Card>
                    )
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

interface MemberProfile {
  member_id: string
  bio: string | null
  skills: string[] | null
  linkedin_url: string | null
  github_url: string | null
  member: {
    id: string
    full_name: string | null
    avatar_url: string | null
    job_title: string | null
    company: string | null
    member_type: string | null
  } | null
}

interface Connection {
  id: string
  from_member_id: string
  to_member_id: string
  status: string
  message: string | null
  created_at: string
}

interface MyProfile {
  is_visible: boolean
  bio: string | null
  skills: string[] | null
  linkedin_url: string | null
  github_url: string | null
}

interface Props {
  myMemberId: string
  myProfile: MyProfile | null
  visibleMembers: MemberProfile[]
  connections: Connection[]
}

export default function NetworkClient({ myMemberId, myProfile, visibleMembers, connections }: Props) {
  const [isVisible, setIsVisible] = useState(myProfile?.is_visible ?? false)
  const [bio, setBio] = useState(myProfile?.bio ?? '')
  const [skills, setSkills] = useState((myProfile?.skills ?? []).join(', '))
  const [linkedin, setLinkedin] = useState(myProfile?.linkedin_url ?? '')
  const [github, setGithub] = useState(myProfile?.github_url ?? '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  const [connecting, setConnecting] = useState<Record<string, boolean>>({})
  const [sent, setSent] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState('')

  const connMap = new Map<string, Connection>()
  for (const c of connections) {
    const other = c.from_member_id === myMemberId ? c.to_member_id : c.from_member_id
    connMap.set(other, c)
  }

  const pending = connections.filter(
    (c) => c.to_member_id === myMemberId && c.status === 'pending'
  )

  async function saveProfile() {
    setSavingProfile(true)
    await fetch('/api/network/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        is_visible: isVisible,
        bio,
        skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
        linkedin_url: linkedin || null,
        github_url: github || null,
      }),
    })
    setSavingProfile(false)
    setProfileSaved(true)
  }

  async function connect(toId: string) {
    setConnecting((prev) => ({ ...prev, [toId]: true }))
    await fetch('/api/network/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_member_id: toId, message }),
    })
    setSent((prev) => new Set([...prev, toId]))
    setConnecting((prev) => ({ ...prev, [toId]: false }))
  }

  async function respond(connId: string, status: 'accepted' | 'declined') {
    await fetch('/api/network/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connection_id: connId, status }),
    })
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Networking</h1>
        <p className="text-muted-foreground text-sm mt-1">Connect with the NODE community</p>
      </div>

      {/* My profile settings */}
      <Card className="bg-[#13161f] border-[#252b3a] mb-8">
        <CardContent className="pt-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">My Networking Profile</h2>
            <button
              onClick={() => setIsVisible(!isVisible)}
              className={`w-10 h-5 rounded-full transition-colors ${isVisible ? 'bg-[#f0e6d3]' : 'bg-[#252b3a]'}`}
            >
              <span className={`block w-4 h-4 rounded-full bg-background transition-transform mx-0.5 ${isVisible ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <Label className="text-xs">Bio</Label>
              <Input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A short bio..." className="mt-1 bg-background border-[#252b3a] text-sm" />
            </div>
            <div>
              <Label className="text-xs">Skills (comma-separated)</Label>
              <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="React, Python, Rust..." className="mt-1 bg-background border-[#252b3a] text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">LinkedIn URL</Label>
                <Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." className="mt-1 bg-background border-[#252b3a] text-sm" />
              </div>
              <div>
                <Label className="text-xs">GitHub URL</Label>
                <Input value={github} onChange={(e) => setGithub(e.target.value)} placeholder="https://github.com/..." className="mt-1 bg-background border-[#252b3a] text-sm" />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <Button onClick={saveProfile} disabled={savingProfile} size="sm" className="bg-[#f0e6d3] text-black hover:bg-[#e8dcc8]">
                {savingProfile ? 'Saving...' : 'Save profile'}
              </Button>
              {profileSaved && <span className="text-xs text-green-400">Saved!</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending requests */}
      {pending.length > 0 && (
        <>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Pending Requests</h2>
          <div className="flex flex-col gap-2 mb-8">
            {pending.map((c) => {
              const from = visibleMembers.find((m) => m.member_id === c.from_member_id)
              return (
                <Card key={c.id} className="bg-[#13161f] border-[#f0e6d3]/20">
                  <CardContent className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{from?.member?.full_name ?? 'A member'}</p>
                      {c.message && <p className="text-xs text-muted-foreground mt-0.5">{c.message}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => respond(c.id, 'accepted')} className="bg-[#f0e6d3] text-black hover:bg-[#e8dcc8] text-xs">Accept</Button>
                      <Button size="sm" variant="outline" onClick={() => respond(c.id, 'declined')} className="border-[#252b3a] text-xs">Decline</Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
          <Separator className="mb-8" />
        </>
      )}

      {/* Discover members */}
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Discover Members</h2>
      {visibleMembers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No members have enabled networking yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {visibleMembers.map((mp) => {
            const m = mp.member
            if (!m) return null
            const initials = (m.full_name ?? '?').split(' ').map((n) => n[0]).join('').toUpperCase()
            const conn = connMap.get(mp.member_id)
            const isSent = sent.has(mp.member_id)
            const statusLabel = conn?.status === 'accepted' ? 'Connected' : conn?.status === 'pending' ? 'Pending' : null

            return (
              <Card key={mp.member_id} className="bg-[#13161f] border-[#252b3a]">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={m.avatar_url ?? undefined} />
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{m.full_name}</p>
                      {(m.job_title || m.company) && (
                        <p className="text-xs text-muted-foreground">{[m.job_title, m.company].filter(Boolean).join(' at ')}</p>
                      )}
                      {mp.bio && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{mp.bio}</p>}
                      {(mp.skills ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(mp.skills ?? []).slice(0, 4).map((s) => (
                            <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {statusLabel ? (
                      <Badge variant="outline" className="text-xs">{statusLabel}</Badge>
                    ) : isSent ? (
                      <Badge variant="outline" className="text-xs">Request sent</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs border-[#252b3a]"
                        onClick={() => connect(mp.member_id)}
                        disabled={connecting[mp.member_id]}
                      >
                        {connecting[mp.member_id] ? 'Sending...' : 'Connect'}
                      </Button>
                    )}
                    {mp.linkedin_url && (
                      <Button size="sm" variant="ghost" asChild className="text-xs">
                        <a href={mp.linkedin_url} target="_blank" rel="noreferrer">LinkedIn</a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

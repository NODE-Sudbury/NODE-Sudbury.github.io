'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

interface MentorProfile {
  member_id: string
  bio: string | null
  skills: string[] | null
  capacity: number
  member: {
    id: string
    full_name: string | null
    avatar_url: string | null
    job_title: string | null
    company: string | null
  } | null
}

interface MentorshipRequest {
  id: string
  mentor_id: string
  mentee_id: string
  status: string
  message: string | null
  created_at: string
}

interface MyProfile {
  is_mentor: boolean
  skills: string[] | null
  capacity: number
  bio: string | null
}

interface Props {
  myMemberId: string
  myProfile: MyProfile | null
  mentors: MentorProfile[]
  myRequests: MentorshipRequest[]
}

export default function MentorshipClient({ myMemberId, myProfile, mentors, myRequests }: Props) {
  const [isMentor, setIsMentor] = useState(myProfile?.is_mentor ?? false)
  const [mentorBio, setMentorBio] = useState(myProfile?.bio ?? '')
  const [mentorSkills, setMentorSkills] = useState((myProfile?.skills ?? []).join(', '))
  const [capacity, setCapacity] = useState(String(myProfile?.capacity ?? 3))
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  const [requesting, setRequesting] = useState<Record<string, boolean>>({})
  const [requestMsg, setRequestMsg] = useState('')
  const [requested, setRequested] = useState<Set<string>>(new Set())

  const sentRequests = new Map(
    myRequests
      .filter((r) => r.mentee_id === myMemberId)
      .map((r) => [r.mentor_id, r.status])
  )

  const incomingRequests = myRequests.filter(
    (r) => r.mentor_id === myMemberId && r.status === 'pending'
  )

  async function saveProfile() {
    setSavingProfile(true)
    await fetch('/api/mentorship/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        is_mentor: isMentor,
        bio: mentorBio,
        skills: mentorSkills.split(',').map((s) => s.trim()).filter(Boolean),
        capacity: parseInt(capacity) || 3,
      }),
    })
    setSavingProfile(false)
    setProfileSaved(true)
  }

  async function requestMentor(mentorId: string) {
    setRequesting((prev) => ({ ...prev, [mentorId]: true }))
    await fetch('/api/mentorship/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mentor_id: mentorId, message: requestMsg }),
    })
    setRequested((prev) => new Set([...prev, mentorId]))
    setRequesting((prev) => ({ ...prev, [mentorId]: false }))
  }

  async function respondRequest(reqId: string, status: 'accepted' | 'declined') {
    await fetch('/api/mentorship/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: reqId, status }),
    })
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Mentorship</h1>
        <p className="text-muted-foreground text-sm mt-1">Connect with experienced mentors in the NODE community</p>
      </div>

      {/* Mentor registration */}
      <Card className="bg-[#13161f] border-[#252b3a] mb-8">
        <CardContent className="pt-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Register as Mentor</h2>
            <button
              onClick={() => setIsMentor(!isMentor)}
              className={`w-10 h-5 rounded-full transition-colors ${isMentor ? 'bg-[#f0e6d3]' : 'bg-[#252b3a]'}`}
            >
              <span className={`block w-4 h-4 rounded-full bg-background transition-transform mx-0.5 ${isMentor ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          {isMentor && (
            <div className="flex flex-col gap-3">
              <div>
                <Label className="text-xs">Mentor bio</Label>
                <Input value={mentorBio} onChange={(e) => setMentorBio(e.target.value)} placeholder="What can you help with?" className="mt-1 bg-background border-[#252b3a] text-sm" />
              </div>
              <div>
                <Label className="text-xs">Skills you mentor in (comma-separated)</Label>
                <Input value={mentorSkills} onChange={(e) => setMentorSkills(e.target.value)} placeholder="React, career growth, system design..." className="mt-1 bg-background border-[#252b3a] text-sm" />
              </div>
              <div>
                <Label className="text-xs">Max mentees at a time</Label>
                <Input type="number" min={1} max={10} value={capacity} onChange={(e) => setCapacity(e.target.value)} className="mt-1 bg-background border-[#252b3a] text-sm w-24" />
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 mt-4">
            <Button onClick={saveProfile} disabled={savingProfile} size="sm" className="bg-[#f0e6d3] text-black hover:bg-[#e8dcc8]">
              {savingProfile ? 'Saving...' : 'Save'}
            </Button>
            {profileSaved && <span className="text-xs text-green-400">Saved!</span>}
          </div>
        </CardContent>
      </Card>

      {/* Incoming requests (for mentors) */}
      {incomingRequests.length > 0 && (
        <>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Mentorship Requests</h2>
          <div className="flex flex-col gap-2 mb-8">
            {incomingRequests.map((r) => (
              <Card key={r.id} className="bg-[#13161f] border-[#f0e6d3]/20">
                <CardContent className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Mentee ID: {r.mentee_id.slice(0, 8)}...</p>
                    {r.message && <p className="text-xs text-muted-foreground mt-0.5">{r.message}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => respondRequest(r.id, 'accepted')} className="bg-[#f0e6d3] text-black hover:bg-[#e8dcc8] text-xs">Accept</Button>
                    <Button size="sm" variant="outline" onClick={() => respondRequest(r.id, 'declined')} className="border-[#252b3a] text-xs">Decline</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Separator className="mb-8" />
        </>
      )}

      {/* Message for request */}
      <div className="mb-4">
        <Label className="text-xs text-muted-foreground">Message to send with your request (optional)</Label>
        <Input
          value={requestMsg}
          onChange={(e) => setRequestMsg(e.target.value)}
          placeholder="What are you hoping to get out of mentorship?"
          className="mt-1 bg-[#13161f] border-[#252b3a] text-sm"
        />
      </div>

      {/* Available mentors */}
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Available Mentors</h2>
      {mentors.length === 0 ? (
        <p className="text-sm text-muted-foreground">No mentors available yet. Be the first to register!</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {mentors.map((mp) => {
            const m = mp.member
            if (!m) return null
            const initials = (m.full_name ?? '?').split(' ').map((n) => n[0]).join('').toUpperCase()
            const existingStatus = sentRequests.get(mp.member_id)
            const isRequested = requested.has(mp.member_id)

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
                      <p className="text-[10px] text-muted-foreground mt-1">Max {mp.capacity} mentee{mp.capacity !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    {existingStatus ? (
                      <Badge variant="outline" className="text-xs capitalize">{existingStatus}</Badge>
                    ) : isRequested ? (
                      <Badge variant="outline" className="text-xs">Request sent</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs border-[#252b3a]"
                        onClick={() => requestMentor(mp.member_id)}
                        disabled={requesting[mp.member_id]}
                      >
                        {requesting[mp.member_id] ? 'Sending...' : 'Request mentor'}
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

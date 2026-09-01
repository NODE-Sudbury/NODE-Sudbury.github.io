'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'

interface Props {
  event: { id: string; title: string; slug: string; hackathon_submission_deadline: string | null }
  team: { id: string; name: string } | null
  submission: any | null
  memberId: string
  prizeTrackOptions: string[]
}

const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  submitted: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  final: 'bg-green-500/15 text-green-400 border-green-500/30',
}

export default function SubmitClient({ event, team, submission, memberId, prizeTrackOptions }: Props) {
  const [title, setTitle] = useState(submission?.title ?? '')
  const [shortDesc, setShortDesc] = useState(submission?.short_description ?? '')
  const [demoUrl, setDemoUrl] = useState(submission?.demo_url ?? '')
  const [deckUrl, setDeckUrl] = useState(submission?.deck_url ?? '')
  const [selectedTracks, setSelectedTracks] = useState<string[]>(submission?.prize_tracks ?? [])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [currentStatus, setCurrentStatus] = useState<string>(submission?.sub_status ?? 'draft')

  const isLocked = currentStatus === 'final'
  const deadline = event.hackathon_submission_deadline ? new Date(event.hackathon_submission_deadline) : null
  const isPastDeadline = deadline ? new Date() > deadline : false

  if (!team) {
    return (
      <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <p className="text-[#c9d1e8] text-lg font-semibold">No team found</p>
          <p className="text-[#5a6278] text-sm">You need to join or create a team before submitting.</p>
          <Link href={`/hackathon/${event.id}`}>
            <Button className="bg-[#f0e6d3] text-[#0b0e14] hover:bg-[#f0e6d3]/90 mt-2">
              Go to Team Formation
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  async function save(newStatus: 'draft' | 'submitted' | 'final') {
    if (isLocked) return
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/hackathon/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: event.id,
          title, short_description: shortDesc, demo_url: demoUrl, deck_url: deckUrl,
          prize_tracks: selectedTracks,
          sub_status: newStatus,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error ?? 'Failed to save' })
      } else {
        setCurrentStatus(data.submission.sub_status)
        setMessage({ type: 'success', text: newStatus === 'final' ? 'Submission finalized!' : 'Saved successfully.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0e14] text-[#c9d1e8]">
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href={`/hackathon/${event.id}`} className="text-[#5a6278] hover:text-[#f0e6d3] text-sm">
              ← {event.title}
            </Link>
          </div>
          <h1 className="text-2xl font-semibold text-[#f0e6d3]">Project Submission</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-sm text-[#5a6278]">Team: <span className="text-[#c9d1e8]">{team.name}</span></span>
            {currentStatus && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded border ${STATUS_COLOR[currentStatus] ?? ''}`}>
                {currentStatus}
              </span>
            )}
          </div>
          {deadline && (
            <p className={`text-xs mt-1 ${isPastDeadline ? 'text-red-400' : 'text-[#5a6278]'}`}>
              Deadline: {deadline.toLocaleString('en-CA', { timeZone: 'America/Toronto' })}
              {isPastDeadline && ' — Submissions closed'}
            </p>
          )}
        </div>

        {isLocked && (
          <div className="border border-green-500/30 bg-green-500/10 rounded-lg px-4 py-3 text-sm text-green-400">
            This submission is finalized and locked. Contact a board member to make changes.
          </div>
        )}

        {message && (
          <div className={`border rounded-lg px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-green-500/30 bg-green-500/10 text-green-400'
              : 'border-red-500/30 bg-red-500/10 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        <Card className="bg-[#13161f] border-[#252b3a]">
          <CardContent className="pt-6 space-y-5">
            <div className="space-y-1.5">
              <Label className="text-[#c9d1e8]">Project Title <span className="text-red-400">*</span></Label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                disabled={isLocked || isPastDeadline}
                placeholder="e.g. TrailSync - Offline Trail Navigation for Northern Ontario"
                className="bg-[#0b0e14] border-[#252b3a] text-[#c9d1e8] placeholder:text-[#3a3f52]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[#c9d1e8]">
                Short Description <span className="text-red-400">*</span>
                <span className="text-[#5a6278] font-normal ml-2">{shortDesc.length}/300</span>
              </Label>
              <textarea
                value={shortDesc}
                onChange={e => setShortDesc(e.target.value.slice(0, 300))}
                disabled={isLocked || isPastDeadline}
                placeholder="What does your project do in 1-2 sentences?"
                rows={3}
                className="w-full px-3 py-2 bg-[#0b0e14] border border-[#252b3a] rounded-md text-[#c9d1e8] placeholder:text-[#3a3f52] text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#f0e6d3]/30 disabled:opacity-50"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[#c9d1e8]">Demo / Repo URL</Label>
              <Input
                value={demoUrl}
                onChange={e => setDemoUrl(e.target.value)}
                disabled={isLocked || isPastDeadline}
                placeholder="https://github.com/yourteam/project"
                className="bg-[#0b0e14] border-[#252b3a] text-[#c9d1e8] placeholder:text-[#3a3f52]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[#c9d1e8]">Slide Deck URL <span className="text-[#5a6278] font-normal">(optional)</span></Label>
              <Input
                value={deckUrl}
                onChange={e => setDeckUrl(e.target.value)}
                disabled={isLocked || isPastDeadline}
                placeholder="https://docs.google.com/presentation/..."
                className="bg-[#0b0e14] border-[#252b3a] text-[#c9d1e8] placeholder:text-[#3a3f52]"
              />
            </div>

            {prizeTrackOptions.length > 0 && (
              <div className="space-y-2">
                <Label className="text-[#c9d1e8]">
                  Prize Tracks <span className="text-[#5a6278] font-normal">(select all that apply)</span>
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {prizeTrackOptions.map((track) => {
                    const checked = selectedTracks.includes(track)
                    const disabled = isLocked || isPastDeadline
                    return (
                      <label
                        key={track}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-md border cursor-pointer select-none transition-colors ${
                          checked
                            ? 'border-[#f0e6d3]/40 bg-[#f0e6d3]/8 text-[#f0e6d3]'
                            : 'border-[#252b3a] bg-[#0b0e14] text-[#5a6278] hover:border-[#3a3f52] hover:text-[#c9d1e8]'
                        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => {
                            if (disabled) return
                            setSelectedTracks(prev =>
                              prev.includes(track)
                                ? prev.filter(t => t !== track)
                                : [...prev, track]
                            )
                          }}
                          className="accent-[#f0e6d3] w-3.5 h-3.5 shrink-0"
                        />
                        <span className="text-sm">{track}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {!isLocked && !isPastDeadline && (
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => save('draft')}
              disabled={saving || !title.trim() || !shortDesc.trim()}
              className="border-[#252b3a] text-[#c9d1e8] hover:bg-[#1a1f2c]"
            >
              {saving ? 'Saving…' : 'Save Draft'}
            </Button>
            <Button
              onClick={() => save('submitted')}
              disabled={saving || !title.trim() || !shortDesc.trim()}
              className="bg-[#f0e6d3]/10 text-[#f0e6d3] border border-[#f0e6d3]/30 hover:bg-[#f0e6d3]/20"
            >
              Mark as Submitted
            </Button>
            <Separator orientation="vertical" className="h-8 bg-[#252b3a]" />
            <Button
              onClick={() => {
                if (confirm('Finalize submission? This cannot be undone.')) save('final')
              }}
              disabled={saving || !title.trim() || !shortDesc.trim()}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Finalize
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

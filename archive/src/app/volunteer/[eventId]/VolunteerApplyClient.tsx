'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

type Event = { id: string; title: string; starts_at: string; ends_at: string }
type Application = { id: string; status: string } | null

export function VolunteerApplyClient({
  event, existing, memberId
}: {
  event: Event
  existing: Application
  memberId: string
}) {
  const router = useRouter()
  const [motivation, setMotivation] = useState('')
  const [hours, setHours] = useState('')
  const [skills, setSkills] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(!!existing)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/volunteer/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: event.id,
        motivation,
        hours_available: hours ? parseInt(hours) : null,
        skills: skills.split(',').map(s => s.trim()).filter(Boolean),
      }),
    })
    if (res.ok) {
      setDone(true)
    }
    setLoading(false)
  }

  if (done || existing) {
    const status = existing?.status ?? 'pending'
    return (
      <div className="text-center space-y-4">
        <div className="text-4xl">
          {status === 'approved' ? '' : status === 'rejected' ? '' : ''}
        </div>
        <h1 className="text-2xl font-bold">
          {status === 'approved'
            ? "You're approved as a volunteer!"
            : status === 'rejected'
            ? 'Application not accepted'
            : 'Application submitted'}
        </h1>
        <p className="text-muted-foreground">
          {status === 'approved'
            ? `See you at ${event.title}! Check your email for details.`
            : status === 'rejected'
            ? 'Thank you for applying. We may reach out for future events.'
            : `We'll review your application and get back to you soon.`}
        </p>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          Back to dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Volunteer Application</h1>
        <p className="text-muted-foreground mt-1">
          {event.title} - {new Date(event.starts_at).toLocaleDateString()}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Why do you want to volunteer?
          </label>
          <textarea
            value={motivation}
            onChange={e => setMotivation(e.target.value)}
            rows={4}
            required
            className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-foreground/30"
            placeholder="Tell us what motivates you to help..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            Hours available per week (optional)
          </label>
          <input
            type="number"
            min={1}
            max={40}
            value={hours}
            onChange={e => setHours(e.target.value)}
            className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/30"
            placeholder="e.g. 5"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            Relevant skills (comma-separated, optional)
          </label>
          <input
            type="text"
            value={skills}
            onChange={e => setSkills(e.target.value)}
            className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/30"
            placeholder="e.g. event coordination, graphic design, A/V"
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Submitting...' : 'Submit application'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

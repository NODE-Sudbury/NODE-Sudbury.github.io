'use client'

import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface Props {
  event: { id: string; title: string; slug: string }
}

const STATUS_COLOR: Record<string, string> = {
  submitted: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  under_review: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  accepted: 'bg-green-500/10 text-green-400 border-green-500/20',
  rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
  withdrawn: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
}

export default function CFPForm({ event }: Props) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [existing, setExisting] = useState<any>(null)
  const [editing, setEditing] = useState(false)

  const [form, setForm] = useState({
    title: '', talk_type: 'talk', duration_minutes: 30,
    abstract: '', speaker_bio: '', requirements: '',
    co_speakers: '', is_first_time: false,
  })

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = `/login?next=/cfp/${event.id}`; return }
      const { data: sub } = await supabase
        .from('cfp_submissions')
        .select('*')
        .eq('event_id', event.id)
        .eq('member_id', data.session.user.id)
        .maybeSingle()
      if (sub) {
        setExisting(sub)
        setForm({
          title: sub.title, talk_type: sub.talk_type, duration_minutes: sub.duration_minutes,
          abstract: sub.abstract, speaker_bio: sub.speaker_bio ?? '', requirements: sub.requirements ?? '',
          co_speakers: (sub.co_speakers ?? []).join(', '), is_first_time: sub.is_first_time ?? false,
        })
      }
      setLoading(false)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const res = await fetch('/api/cfp/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: event.id,
        ...form,
        co_speakers: form.co_speakers ? form.co_speakers.split(',').map(s => s.trim()).filter(Boolean) : [],
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Submission failed'); setSubmitting(false); return }
    setSuccess(true)
    setExisting(data.submission)
    setEditing(false)
    setSubmitting(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center">
      <div className="w-5 h-5 rounded-full border-2 border-[#f0e6d3] border-t-transparent animate-spin" />
    </div>
  )

  const locked = existing && ['accepted', 'rejected'].includes(existing.status)

  return (
    <div className="min-h-screen bg-[#0b0e14] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <p className="text-[#5a6278] text-sm mb-1">{event.title}</p>
          <h1 className="text-2xl font-semibold text-white">Call for Proposals</h1>
          <p className="text-[#5a6278] text-sm mt-2">Submit a talk, workshop, or demo for consideration.</p>
        </div>

        {success && (
          <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
            Your proposal has been submitted. We'll be in touch!
          </div>
        )}

        {existing && !editing && (
          <div className="bg-[#13161f] border border-[#252b3a] rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-white">{existing.title}</h2>
              <span className={`text-xs px-2 py-1 rounded border font-medium capitalize ${STATUS_COLOR[existing.status] ?? ''}`}>
                {existing.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm text-[#5a6278] mb-1">{existing.talk_type} · {existing.duration_minutes} min</p>
            <p className="text-sm text-[#c9d1e8] line-clamp-3">{existing.abstract}</p>
            {!locked && (
              <Button onClick={() => setEditing(true)} variant="outline" size="sm" className="mt-4">
                Edit Proposal
              </Button>
            )}
            {locked && (
              <p className="text-xs text-[#5a6278] mt-3">This proposal has been {existing.status} and can no longer be edited.</p>
            )}
          </div>
        )}

        {(!existing || editing) && !locked && (
          <form onSubmit={handleSubmit} className="bg-[#13161f] border border-[#252b3a] rounded-xl p-6 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-[#c9d1e8]">Talk title *</Label>
              <Input id="title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                required placeholder="Your talk title" className="bg-[#0b0e14] border-[#252b3a] text-white" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[#c9d1e8]">Type *</Label>
                <select value={form.talk_type} onChange={e => setForm(f => ({ ...f, talk_type: e.target.value }))}
                  className="w-full h-10 rounded-md border border-[#252b3a] bg-[#0b0e14] text-white px-3 text-sm">
                  <option value="talk">Talk</option>
                  <option value="workshop">Workshop</option>
                  <option value="lightning">Lightning Talk</option>
                  <option value="panel">Panel</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[#c9d1e8]">Duration *</Label>
                <select value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))}
                  className="w-full h-10 rounded-md border border-[#252b3a] bg-[#0b0e14] text-white px-3 text-sm">
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>60 min</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="abstract" className="text-[#c9d1e8]">Abstract * <span className="text-[#5a6278] font-normal">({form.abstract.length}/1000)</span></Label>
              <textarea id="abstract" value={form.abstract} onChange={e => setForm(f => ({ ...f, abstract: e.target.value }))}
                required maxLength={1000} rows={5} placeholder="What will attendees learn?"
                className="w-full rounded-md border border-[#252b3a] bg-[#0b0e14] text-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#f0e6d3]/30" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio" className="text-[#c9d1e8]">Speaker bio <span className="text-[#5a6278] font-normal">({form.speaker_bio.length}/500)</span></Label>
              <textarea id="bio" value={form.speaker_bio} onChange={e => setForm(f => ({ ...f, speaker_bio: e.target.value }))}
                maxLength={500} rows={3} placeholder="Brief speaker bio"
                className="w-full rounded-md border border-[#252b3a] bg-[#0b0e14] text-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#f0e6d3]/30" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="requirements" className="text-[#c9d1e8]">Requirements</Label>
              <textarea id="requirements" value={form.requirements} onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))}
                rows={2} placeholder="AV needs, room setup, etc."
                className="w-full rounded-md border border-[#252b3a] bg-[#0b0e14] text-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#f0e6d3]/30" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cospeakers" className="text-[#c9d1e8]">Co-speakers</Label>
              <Input id="cospeakers" value={form.co_speakers} onChange={e => setForm(f => ({ ...f, co_speakers: e.target.value }))}
                placeholder="Names separated by commas" className="bg-[#0b0e14] border-[#252b3a] text-white" />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_first_time} onChange={e => setForm(f => ({ ...f, is_first_time: e.target.checked }))}
                className="rounded border-[#252b3a]" />
              <span className="text-sm text-[#c9d1e8]">This is my first time speaking at a tech event</span>
            </label>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting}
                className="bg-[#f0e6d3] text-[#0b0e14] hover:bg-[#f0e6d3]/90">
                {submitting ? 'Submitting...' : existing ? 'Update Proposal' : 'Submit Proposal'}
              </Button>
              {editing && (
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

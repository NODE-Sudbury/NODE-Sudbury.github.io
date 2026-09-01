'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

type EventRow = {
  id: string
  title: string
  slug: string
  type: string
  status: string
  starts_at: string
  ends_at: string
  max_capacity: number | null
  location_id: string | null
  event_locations: { name: string } | null
  ticket_types: Array<{ id: string; name: string; pricing_model: string; price_cents: number; quantity_available: number | null; quantity_sold: number }>
}

type Location = { id: string; name: string }

const STATUS_DOT: Record<string, string> = {
  published: 'bg-green-400',
  draft:     'bg-yellow-400',
  archived:  'bg-zinc-500',
  cancelled: 'bg-red-400',
  postponed: 'bg-orange-400',
  unlisted:  'bg-blue-400',
  private:   'bg-purple-400',
}

const TYPE_COLOR: Record<string, string> = {
  hackathon:     '#7aa2f7',
  workshop:      '#9ece6a',
  meetup:        '#73daca',
  conference:    '#bb9af7',
  norcat_series: '#e0af68',
  unconference:  '#f7768e',
  study_group:   '#73daca',
  demo_day:      '#ff9e64',
  job_fair:      '#9ece6a',
  game_jam:      '#bb9af7',
  async_event:   '#7aa2f7',
}

const EVENT_TYPES = [
  'meetup','workshop','hackathon','conference','norcat_series',
  'unconference','study_group','demo_day','game_jam','job_fair','async_event',
]

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', {
    month: 'short', day: 'numeric', year: 'numeric',
    timeZone: 'America/Toronto',
  })
}

function totalTickets(tt: EventRow['ticket_types']) {
  if (!tt || tt.length === 0) return '-'
  const sold = tt.reduce((s, t) => s + (t.quantity_sold ?? 0), 0)
  const avail = tt.reduce((s, t) => s + (t.quantity_available ?? 0), 0)
  return `${sold}/${avail || '?'}`
}

type EmailModal = { type: 'announce' | 'post_event'; eventId: string; eventTitle: string }
type LinksModal = { eventId: string; eventTitle: string }
type SaveTplModal = { eventId: string; eventTitle: string }

export function AdminEventsClient({ events: initialEvents, locations }: { events: EventRow[]; locations: Location[] }) {
  const [events, setEvents] = useState(initialEvents)
  const [showForm, setShowForm] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [emailModal, setEmailModal] = useState<EmailModal | null>(null)
  const [saveTplModal, setSaveTplModal] = useState<SaveTplModal | null>(null)
  const [saveTplForm, setSaveTplForm] = useState({ template_name: '', description: '' })
  const [saveTplSubmitting, setSaveTplSubmitting] = useState(false)
  const [saveTplMsg, setSaveTplMsg] = useState('')
  const [cloningId, setCloningId] = useState<string | null>(null)
  const [cloneMsg, setCloneMsg] = useState('')
  const [emailForm, setEmailForm] = useState({ subject: '', message: '', survey_url: '', recording_url: '' })
  const [emailSending, setEmailSending] = useState(false)
  const [emailResult, setEmailResult] = useState('')
  const [linksModal, setLinksModal] = useState<LinksModal | null>(null)
  const [linksForm, setLinksForm] = useState({ recording_url: '', photos_url: '', recap_url: '' })
  const [linksSaving, setLinksSaving] = useState(false)
  const [linksResult, setLinksResult] = useState('')

  async function handleSaveLinks(e: React.FormEvent) {
    e.preventDefault()
    if (!linksModal) return
    setLinksSaving(true)
    setLinksResult('')
    const res = await fetch(`/api/admin/events/${linksModal.eventId}/post-event-links`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(linksForm),
    })
    setLinksSaving(false)
    if (res.ok) {
      setLinksResult('Saved!')
      setTimeout(() => { setLinksModal(null); setLinksResult('') }, 1500)
    } else {
      setLinksResult('Failed to save.')
    }
  }

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!emailModal) return
    setEmailSending(true)
    setEmailResult('')
    const endpoint = emailModal.type === 'announce'
      ? `/api/admin/events/${emailModal.eventId}/announce`
      : `/api/admin/events/${emailModal.eventId}/post-event`
    const body = emailModal.type === 'announce'
      ? { subject: emailForm.subject, message: emailForm.message }
      : { survey_url: emailForm.survey_url || undefined, recording_url: emailForm.recording_url || undefined }
    const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setEmailSending(false)
    if (res.ok) {
      const data = await res.json()
      setEmailResult(`Sent to ${data.sent} attendee${data.sent !== 1 ? 's' : ''}.`)
      setTimeout(() => { setEmailModal(null); setEmailResult('') }, 2000)
    } else {
      setEmailResult('Failed to send. Try again.')
    }
  }

  const [form, setForm] = useState({
    title: '', slug: '', type: 'meetup', short_description: '',
    description: '', location_id: '', starts_at: '', ends_at: '',
    max_capacity: '', status: 'draft',
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  function setField(field: string, value: string) {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'title') next.slug = slugify(value)
      return next
    })
  }

  async function handleClone(id: string, title: string) {
    setCloningId(id)
    setCloneMsg('')
    const res = await fetch(`/api/admin/events/${id}/clone`, { method: 'POST' })
    setCloningId(null)
    if (res.ok) {
      const { event } = await res.json()
      setEvents(prev => [{ ...event, event_locations: null, ticket_types: [] }, ...prev])
      setCloneMsg(`"${title}" cloned as draft.`)
      setTimeout(() => setCloneMsg(''), 3000)
    }
  }

  async function handleSaveTemplate(e: React.FormEvent) {
    e.preventDefault()
    if (!saveTplModal) return
    setSaveTplSubmitting(true)
    setSaveTplMsg('')
    const res = await fetch(`/api/admin/events/${saveTplModal.eventId}/save-template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saveTplForm),
    })
    setSaveTplSubmitting(false)
    if (res.ok) {
      setSaveTplMsg('Template saved!')
      setTimeout(() => { setSaveTplModal(null); setSaveTplMsg('') }, 1500)
    } else {
      const d = await res.json().catch(() => ({}))
      setSaveTplMsg(d.error ?? 'Failed.')
    }
  }

  async function handleStatus(id: string, status: string) {
    setActionLoading(id + status)
    const res = await fetch(`/api/admin/events/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setActionLoading(null)
    if (res.ok) {
      setEvents(prev => prev.map(e => e.id === id ? { ...e, status } : e))
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (form.starts_at && form.ends_at && new Date(form.ends_at) <= new Date(form.starts_at)) {
      setError('End date must be after start date.')
      return
    }
    setSubmitting(true)
    const res = await fetch('/api/admin/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        max_capacity: form.max_capacity ? parseInt(form.max_capacity) : null,
        location_id: form.location_id || null,
      }),
    })
    setSubmitting(false)
    if (res.ok) {
      const { event } = await res.json()
      setEvents(prev => [event, ...prev])
      setSuccess(`Event "${event.title}" created.`)
      setForm({ title:'', slug:'', type:'meetup', short_description:'', description:'', location_id:'', starts_at:'', ends_at:'', max_capacity:'', status:'draft' })
      setShowForm(false)
    } else {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Failed to create event.')
    }
  }

  const inputCls2 = 'w-full bg-[#0b0e14] border border-[#252b3a] rounded-md px-3 py-2 text-sm text-[#c9d1e8] focus:outline-none focus:ring-1 focus:ring-[#f0e6d3]/40'
  const selectCls = 'w-full bg-[#0b0e14] border border-[#252b3a] rounded-md px-3 py-2 text-sm text-[#c9d1e8] focus:outline-none focus:ring-1 focus:ring-[#f0e6d3]/40'
  const inputCls = 'bg-[#0b0e14] border-[#252b3a] text-[#c9d1e8] focus-visible:ring-[#f0e6d3]/40 placeholder:text-[#5a6278]'

  return (
    <div className="space-y-6">

      {/* Save as Template modal */}
      {saveTplModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#13161f] border border-[#252b3a] rounded-lg p-6 w-full max-w-md space-y-4">
            <p className="text-sm font-semibold text-[#f0e6d3]">Save as Template</p>
            <p className="text-xs text-[#5a6278]">{saveTplModal.eventTitle}</p>
            <form onSubmit={handleSaveTemplate} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-[#5a6278]">Template Name *</Label>
                <input required value={saveTplForm.template_name} onChange={e => setSaveTplForm(f => ({ ...f, template_name: e.target.value }))} className={inputCls2} placeholder="Monthly Meetup Template" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#5a6278]">Description</Label>
                <input value={saveTplForm.description} onChange={e => setSaveTplForm(f => ({ ...f, description: e.target.value }))} className={inputCls2} placeholder="Optional description" />
              </div>
              {saveTplMsg && <p className="text-xs text-green-400">{saveTplMsg}</p>}
              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={saveTplSubmitting} size="sm" className="bg-[#f0e6d3] text-[#0b0e14] hover:bg-[#e8dcc8] font-semibold text-xs">
                  {saveTplSubmitting ? 'Saving...' : 'Save Template'}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSaveTplModal(null)} className="text-[#5a6278] text-xs">Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Email modal */}
      {emailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#13161f] border border-[#252b3a] rounded-lg p-6 w-full max-w-md space-y-4">
            <p className="text-sm font-semibold text-[#f0e6d3]">
              {emailModal.type === 'announce' ? 'Send Announcement' : 'Send Post-Event Email'}
            </p>
            <p className="text-xs text-[#5a6278]">{emailModal.eventTitle}</p>
            <form onSubmit={handleSendEmail} className="space-y-3">
              {emailModal.type === 'announce' ? (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs text-[#5a6278]">Subject *</Label>
                    <input required value={emailForm.subject} onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))} className={inputCls2} placeholder="Important update about the event" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-[#5a6278]">Message *</Label>
                    <textarea required rows={4} value={emailForm.message} onChange={e => setEmailForm(f => ({ ...f, message: e.target.value }))} className={`${inputCls2} resize-y`} placeholder="Your message to attendees..." />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs text-[#5a6278]">Recording URL (optional)</Label>
                    <input type="url" value={emailForm.recording_url} onChange={e => setEmailForm(f => ({ ...f, recording_url: e.target.value }))} className={inputCls2} placeholder="https://youtube.com/..." />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-[#5a6278]">Survey URL (optional)</Label>
                    <input type="url" value={emailForm.survey_url} onChange={e => setEmailForm(f => ({ ...f, survey_url: e.target.value }))} className={inputCls2} placeholder="https://forms.google.com/..." />
                  </div>
                </>
              )}
              {emailResult && <p className="text-xs text-green-400">{emailResult}</p>}
              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={emailSending} size="sm" className="bg-[#f0e6d3] text-[#0b0e14] hover:bg-[#e8dcc8] font-semibold text-xs">
                  {emailSending ? 'Sending...' : 'Send'}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setEmailModal(null)} className="text-[#5a6278] text-xs">Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Post-event links modal */}
      {linksModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#13161f] border border-[#252b3a] rounded-lg p-6 w-full max-w-md space-y-4">
            <p className="text-sm font-semibold text-[#f0e6d3]">Post-Event Links</p>
            <p className="text-xs text-[#5a6278]">{linksModal.eventTitle}</p>
            <form onSubmit={handleSaveLinks} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-[#5a6278]">Recording URL</Label>
                <input type="url" value={linksForm.recording_url} onChange={e => setLinksForm(f => ({ ...f, recording_url: e.target.value }))} className={inputCls2} placeholder="https://youtube.com/..." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#5a6278]">Photos URL</Label>
                <input type="url" value={linksForm.photos_url} onChange={e => setLinksForm(f => ({ ...f, photos_url: e.target.value }))} className={inputCls2} placeholder="https://photos.google.com/..." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#5a6278]">Recap URL</Label>
                <input type="url" value={linksForm.recap_url} onChange={e => setLinksForm(f => ({ ...f, recap_url: e.target.value }))} className={inputCls2} placeholder="https://medium.com/..." />
              </div>
              {linksResult && <p className="text-xs text-green-400">{linksResult}</p>}
              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={linksSaving} size="sm" className="bg-[#f0e6d3] text-[#0b0e14] hover:bg-[#e8dcc8] font-semibold text-xs">
                  {linksSaving ? 'Saving...' : 'Save'}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setLinksModal(null)} className="text-[#5a6278] text-xs">Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-[#5a6278]">{events.length} event{events.length !== 1 ? 's' : ''}</span>
        <Button size="sm" onClick={() => { setShowForm(v => !v); setSuccess(''); setError('') }}
          className="bg-[#f0e6d3] text-[#0b0e14] hover:bg-[#e8dcc8] text-xs font-semibold">
          {showForm ? 'Cancel' : '+ New Event'}
        </Button>
      </div>

      {/* Clone banner */}
      {cloneMsg && (
        <div className="text-sm bg-sky-500/10 border border-sky-500/30 text-sky-400 rounded-md px-4 py-2">
          {cloneMsg}
        </div>
      )}

      {/* Success banner */}
      {success && (
        <div className="text-sm bg-green-500/10 border border-green-500/30 text-green-400 rounded-md px-4 py-2">
          {success}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-[#13161f] border border-[#252b3a] rounded-lg p-6 space-y-4">
          <p className="text-sm font-semibold text-[#f0e6d3]">New Event</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-[#5a6278]">Title *</Label>
              <Input required value={form.title} onChange={e => setField('title', e.target.value)} className={inputCls} placeholder="NODE Sudbury Workshop" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[#5a6278]">Slug *</Label>
              <Input required value={form.slug} onChange={e => setField('slug', e.target.value)} className={inputCls} placeholder="node-sudbury-workshop" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-[#5a6278]">Type *</Label>
              <select required value={form.type} onChange={e => setField('type', e.target.value)} className={selectCls}>
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[#5a6278]">Status</Label>
              <select value={form.status} onChange={e => setField('status', e.target.value)} className={selectCls}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-[#5a6278]">Starts at *</Label>
              <Input required type="datetime-local" value={form.starts_at} onChange={e => setField('starts_at', e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[#5a6278]">Ends at *</Label>
              <Input required type="datetime-local" value={form.ends_at} onChange={e => setField('ends_at', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-[#5a6278]">Location</Label>
              <select value={form.location_id} onChange={e => setField('location_id', e.target.value)} className={selectCls}>
                <option value="">Online / TBD</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[#5a6278]">Max capacity</Label>
              <Input type="number" min={1} value={form.max_capacity} onChange={e => setField('max_capacity', e.target.value)} className={inputCls} placeholder="Leave blank for unlimited" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-[#5a6278]">Short description</Label>
            <textarea
              maxLength={200}
              value={form.short_description}
              onChange={e => setField('short_description', e.target.value)}
              className={`${selectCls} resize-none h-16`}
              placeholder="One-line summary shown on listings (max 200 chars)"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-[#5a6278]">Description</Label>
            <textarea
              value={form.description}
              onChange={e => setField('description', e.target.value)}
              className={`${selectCls} resize-y h-24`}
              placeholder="Full event description (markdown supported)"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={submitting} size="sm"
              className="bg-[#f0e6d3] text-[#0b0e14] hover:bg-[#e8dcc8] font-semibold text-xs">
              {submitting ? 'Creating...' : 'Create Event'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}
              className="text-[#5a6278] hover:text-[#c9d1e8] text-xs">
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Event cards */}
      {events.length === 0 ? (
        <div className="border border-[#1e2235] rounded-xl px-6 py-12 flex flex-col items-center text-center gap-2">
          <p className="text-sm text-[#5a6278]">No events yet. Create your first event above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => {
            const loc = (ev.event_locations as any)?.name ?? 'Online'
            const dot = STATUS_DOT[ev.status] ?? 'bg-zinc-500'
            const typeColor = TYPE_COLOR[ev.type] ?? '#7aa2f7'
            const tickets = totalTickets(ev.ticket_types)
            const isArchived = ev.status === 'archived'
            const isPublished = ev.status === 'published'
            const isDraft = ev.status === 'draft'

            return (
              <div key={ev.id} className="flex gap-0 border border-[#1e2235] rounded-xl bg-[#111520] hover:border-[#2a3558] transition-colors overflow-hidden">
                {/* Type accent bar */}
                <div className="w-1 shrink-0" style={{ background: typeColor }} />

                {/* Main content */}
                <div className="flex-1 p-5 min-w-0">
                  {/* Title */}
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-[#e2e8f0] text-[15px] leading-snug">{ev.title}</h3>
                      <span className="text-[11px] text-[#3a4060] font-mono">{ev.slug}</span>
                    </div>
                  </div>

                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6b7a99] mt-2">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      {fmtDate(ev.starts_at)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {loc}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${dot}`} />
                      <span className="capitalize">{ev.status}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                      {tickets} seats
                    </span>
                    <span style={{ color: typeColor }} className="capitalize font-medium">
                      {ev.type.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-[#1e2235] my-3" />

                  {/* Action links */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    <Link href={`/admin/events/${ev.id}/edit`}
                      className="flex items-center gap-1 text-xs text-[#7aa2f7] hover:text-[#a0c0ff] transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Edit
                    </Link>
                    <Link href={`/events/${ev.slug}`} target="_blank"
                      className="flex items-center gap-1 text-xs text-[#7aa2f7] hover:text-[#a0c0ff] transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      Event page
                    </Link>
                    <Link href={`/admin/events/${ev.id}/registrations`}
                      className="flex items-center gap-1 text-xs text-[#7aa2f7] hover:text-[#a0c0ff] transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                      Registrations
                    </Link>
                    {ev.type === 'hackathon' && (
                      <Link href={`/admin/hackathon/${ev.id}`}
                        className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                        Hackathon
                      </Link>
                    )}
                    {ev.type === 'unconference' && (
                      <Link href={`/admin/unconference/${ev.id}`}
                        className="flex items-center gap-1 text-xs text-[#f7768e] hover:text-[#ff9aaa] transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        Unconference
                      </Link>
                    )}
                    {ev.type === 'study_group' && (
                      <Link href={`/admin/study-group/${ev.id}`}
                        className="flex items-center gap-1 text-xs text-[#73daca] hover:text-[#9aeadb] transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                        Study Group
                      </Link>
                    )}
                    {ev.type === 'demo_day' && (
                      <Link href={`/admin/demos/${ev.id}`}
                        className="flex items-center gap-1 text-xs text-[#ff9e64] hover:text-[#ffb88a] transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                        Demo Day
                      </Link>
                    )}
                    {ev.type === 'job_fair' && (
                      <Link href={`/admin/job-fair/${ev.id}`}
                        className="flex items-center gap-1 text-xs text-[#9ece6a] hover:text-[#b8e88a] transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                        Job Fair
                      </Link>
                    )}
                    {ev.type === 'async_event' && (
                      <Link href={`/admin/async/${ev.id}`}
                        className="flex items-center gap-1 text-xs text-[#7aa2f7] hover:text-[#a0c0ff] transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                        Async Event
                      </Link>
                    )}
                    {(ev.type === 'conference' || ev.type === 'norcat_series') && (
                      <Link href={`/admin/cfp/${ev.id}`}
                        className="flex items-center gap-1 text-xs text-[#bb9af7] hover:text-[#d4b8ff] transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                        CFP Review
                      </Link>
                    )}
                    <Link href={`/admin/quiz/${ev.id}`}
                      className="flex items-center gap-1 text-xs text-[#7aa2f7] hover:text-[#a0c0ff] transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      Quiz
                    </Link>
                    {isDraft && (
                      <button disabled={actionLoading === ev.id + 'published'}
                        onClick={() => handleStatus(ev.id, 'published')}
                        className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors disabled:opacity-40">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                        {actionLoading === ev.id + 'published' ? 'Publishing...' : 'Publish'}
                      </button>
                    )}
                    {isPublished && (
                      <button disabled={actionLoading === ev.id + 'cancelled'}
                        onClick={() => handleStatus(ev.id, 'cancelled')}
                        className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-40">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                        Cancel event
                      </button>
                    )}
                    {(isPublished || isArchived) && (
                      <button onClick={() => { setEmailForm({ subject: '', message: '', survey_url: '', recording_url: '' }); setEmailModal({ type: 'announce', eventId: ev.id, eventTitle: ev.title }) }}
                        className="flex items-center gap-1 text-xs text-[#7aa2f7] hover:text-[#a0c0ff] transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        Announce
                      </button>
                    )}
                    <button disabled={cloningId === ev.id}
                      onClick={() => handleClone(ev.id, ev.title)}
                      className="flex items-center gap-1 text-xs text-[#7aa2f7] hover:text-[#a0c0ff] transition-colors disabled:opacity-40">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      {cloningId === ev.id ? 'Cloning...' : 'Duplicate'}
                    </button>
                    <button onClick={() => { setSaveTplForm({ template_name: '', description: '' }); setSaveTplMsg(''); setSaveTplModal({ eventId: ev.id, eventTitle: ev.title }) }}
                      className="flex items-center gap-1 text-xs text-[#7aa2f7] hover:text-[#a0c0ff] transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      Save as template
                    </button>
                    {isArchived && (
                      <>
                        <button onClick={() => { setEmailForm({ subject: '', message: '', survey_url: '', recording_url: '' }); setEmailModal({ type: 'post_event', eventId: ev.id, eventTitle: ev.title }) }}
                          className="flex items-center gap-1 text-xs text-[#7aa2f7] hover:text-[#a0c0ff] transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                          Post-event email
                        </button>
                        <button onClick={() => { setLinksForm({ recording_url: '', photos_url: '', recap_url: '' }); setLinksModal({ eventId: ev.id, eventTitle: ev.title }) }}
                          className="flex items-center gap-1 text-xs text-[#7aa2f7] hover:text-[#a0c0ff] transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                          Add links
                        </button>
                        <Link href={`/admin/events/${ev.id}/feedback`}
                          className="flex items-center gap-1 text-xs text-[#7aa2f7] hover:text-[#a0c0ff] transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 0 2 2z"/></svg>
                          Feedback
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const EVENT_TYPES = [
  'meetup', 'workshop', 'hackathon', 'conference', 'norcat_series',
  'unconference', 'study_group', 'demo_day', 'game_jam', 'job_fair', 'async_event',
]

const STATUS_OPTIONS = ['draft', 'published', 'unlisted', 'postponed', 'cancelled', 'archived']

const ATTENDANCE_MODES = [
  { value: 'in_person', label: 'In Person' },
  { value: 'virtual',   label: 'Virtual / Online' },
  { value: 'hybrid',    label: 'Hybrid' },
]

function toLocalInput(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface Location { id: string; name: string }
interface HackathonEvent { id: string; title: string; starts_at: string }
interface Series { id: string; name: string }
interface Event {
  id: string
  title: string
  slug: string
  type: string
  status: string
  attendance_mode: string | null
  short_description: string | null
  description: string | null
  starts_at: string
  ends_at: string
  max_capacity: number | null
  location_id: string | null
  hackathon_finals_event_id: string | null
  series_id: string | null
  session_number: number | null
  waitlist_auto_promote: boolean | null
  recording_url: string | null
  photos_url: string | null
  recap_url: string | null
  survey_url: string | null
  hackathon_kickoff_at: string | null
  hackathon_hacking_starts_at: string | null
  hackathon_judging_starts_at: string | null
  hackathon_teams_lock_at: string | null
  hackathon_submission_deadline: string | null
  hackathon_results_announced_at: string | null
}

const inputCls = 'w-full rounded-md border border-[#252b3a] bg-[#0d1117] px-3 py-2 text-sm text-white placeholder:text-[#4a5568] focus:outline-none focus:ring-1 focus:ring-[#38bdf8]'
const labelCls = 'block text-xs font-medium text-[#8892a4] mb-1'

export function EditEventClient({ event, locations, hackathonEvents, series }: {
  event: Event
  locations: Location[]
  hackathonEvents: HackathonEvent[]
  series: Series[]
}) {
  const router = useRouter()
  const [form, setForm] = useState({
    title: event.title,
    slug: event.slug,
    type: event.type,
    status: event.status,
    attendance_mode: event.attendance_mode ?? 'in_person',
    short_description: event.short_description ?? '',
    description: event.description ?? '',
    starts_at: toLocalInput(event.starts_at),
    ends_at: toLocalInput(event.ends_at),
    max_capacity: event.max_capacity ? String(event.max_capacity) : '',
    location_id: event.location_id ?? '',
    hackathon_finals_event_id: event.hackathon_finals_event_id ?? '',
    series_id: event.series_id ?? '',
    session_number: event.session_number ? String(event.session_number) : '',
    waitlist_auto_promote: event.waitlist_auto_promote ?? false,
    recording_url: event.recording_url ?? '',
    photos_url: event.photos_url ?? '',
    recap_url: event.recap_url ?? '',
    survey_url: event.survey_url ?? '',
    hackathon_kickoff_at: toLocalInput(event.hackathon_kickoff_at ?? ''),
    hackathon_hacking_starts_at: toLocalInput(event.hackathon_hacking_starts_at ?? ''),
    hackathon_judging_starts_at: toLocalInput(event.hackathon_judging_starts_at ?? ''),
    hackathon_teams_lock_at: toLocalInput(event.hackathon_teams_lock_at ?? ''),
    hackathon_submission_deadline: toLocalInput(event.hackathon_submission_deadline ?? ''),
    hackathon_results_announced_at: toLocalInput(event.hackathon_results_announced_at ?? ''),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function setField(k: keyof typeof form, v: string) {
    setForm(prev => ({ ...prev, [k]: v }))
    if (k === 'title' && !form.slug) {
      const slug = v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      setForm(prev => ({ ...prev, title: v, slug }))
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (form.starts_at && form.ends_at && new Date(form.ends_at) <= new Date(form.starts_at)) {
      setError('End date must be after start date.')
      return
    }

    setSaving(true)
    const res = await fetch(`/api/admin/events/${event.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        max_capacity: form.max_capacity ? parseInt(form.max_capacity) : null,
        location_id: form.location_id || null,
        hackathon_finals_event_id: form.hackathon_finals_event_id || null,
        series_id: form.series_id || null,
        session_number: form.session_number ? parseInt(form.session_number) : null,
      }),
    })
    setSaving(false)

    if (res.ok) {
      setSuccess('Event saved.')
    } else {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Failed to save.')
    }
  }

  return (
    <form onSubmit={handleSave} className="bg-[#13161f] border border-[#252b3a] rounded-lg p-6 space-y-4">
      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && <p className="text-sm text-green-400">{success}</p>}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={labelCls}>Title <span className="text-red-400">*</span></label>
          <input required value={form.title} onChange={e => setField('title', e.target.value)} className={inputCls} />
        </div>

        <div className="col-span-2">
          <label className={labelCls}>Slug</label>
          <input value={form.slug} onChange={e => setField('slug', e.target.value)} className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Type <span className="text-red-400">*</span></label>
          <select required value={form.type} onChange={e => setField('type', e.target.value)} className={inputCls}>
            {EVENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
        </div>

        <div>
          <label className={labelCls}>Status</label>
          <select value={form.status} onChange={e => setField('status', e.target.value)} className={inputCls}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className={labelCls}>Attendance Mode</label>
          <select value={form.attendance_mode} onChange={e => setField('attendance_mode', e.target.value)} className={inputCls}>
            {ATTENDANCE_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        <div>
          <label className={labelCls}>Start <span className="text-red-400">*</span></label>
          <input required type="datetime-local" value={form.starts_at} onChange={e => setField('starts_at', e.target.value)} className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>End <span className="text-red-400">*</span></label>
          <input required type="datetime-local" value={form.ends_at} onChange={e => setField('ends_at', e.target.value)} className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Capacity</label>
          <input type="number" min="1" value={form.max_capacity} onChange={e => setField('max_capacity', e.target.value)} placeholder="Unlimited" className={inputCls} />
        </div>

        {form.attendance_mode !== 'virtual' && (
          <div>
            <label className={labelCls}>Location</label>
            <select value={form.location_id} onChange={e => setField('location_id', e.target.value)} className={inputCls}>
              <option value="">TBD</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        )}

        {form.type === 'hackathon' && (
          <div className="col-span-2">
            <label className={labelCls}>Finals Event</label>
            <select
              value={form.hackathon_finals_event_id}
              onChange={e => setField('hackathon_finals_event_id', e.target.value)}
              className={inputCls}
            >
              <option value="">No finals event (standalone)</option>
              {hackathonEvents.map(ev => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} ({new Date(ev.starts_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })})
                </option>
              ))}
            </select>
            <p className="text-xs text-[#8892a4] mt-1">Link this kickoff event to its finals event. Teams and submissions stay here; judging and bracket happen at the finals.</p>
          </div>
        )}

        <div className={form.series_id ? 'col-span-1' : 'col-span-2'}>
          <label className={labelCls}>Series</label>
          <select value={form.series_id} onChange={e => setField('series_id', e.target.value)} className={inputCls}>
            <option value="">(None)</option>
            {series.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {form.series_id && (
          <div>
            <label className={labelCls}>Session #</label>
            <input type="number" min="1" value={form.session_number} onChange={e => setField('session_number', e.target.value)} placeholder="e.g. 3" className={inputCls} />
          </div>
        )}

        <div className="col-span-2">
          <label className={labelCls}>Short description</label>
          <input value={form.short_description} onChange={e => setField('short_description', e.target.value)} maxLength={160} className={inputCls} />
        </div>

        <div className="col-span-2">
          <label className={labelCls}>Description (markdown)</label>
          <textarea value={form.description} onChange={e => setField('description', e.target.value)} rows={6} className={`${inputCls} resize-y`} />
        </div>

        {form.type === 'hackathon' && (
          <div className="col-span-2 pt-2 border-t border-[#252b3a]">
            <p className="text-xs font-medium text-[#8892a4] mb-3">Hackathon timeline</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Kickoff</label>
                <input type="datetime-local" value={form.hackathon_kickoff_at} onChange={e => setField('hackathon_kickoff_at', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Hacking begins</label>
                <input type="datetime-local" value={form.hackathon_hacking_starts_at} onChange={e => setField('hackathon_hacking_starts_at', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Teams lock</label>
                <input type="datetime-local" value={form.hackathon_teams_lock_at} onChange={e => setField('hackathon_teams_lock_at', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Submission deadline</label>
                <input type="datetime-local" value={form.hackathon_submission_deadline} onChange={e => setField('hackathon_submission_deadline', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Judging begins</label>
                <input type="datetime-local" value={form.hackathon_judging_starts_at} onChange={e => setField('hackathon_judging_starts_at', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Results announced</label>
                <input type="datetime-local" value={form.hackathon_results_announced_at} onChange={e => setField('hackathon_results_announced_at', e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>
        )}

        <div className="col-span-2 pt-2 border-t border-[#252b3a]">
          <p className="text-xs font-medium text-[#8892a4] mb-3">Post-event links</p>
          <div className="space-y-3">
            <div><label className={labelCls}>Recording URL</label><input value={form.recording_url} onChange={e => setField('recording_url', e.target.value)} placeholder="https://youtube.com/..." className={inputCls} /></div>
            <div><label className={labelCls}>Photos / Gallery URL</label><input value={form.photos_url} onChange={e => setField('photos_url', e.target.value)} placeholder="https://photos.google.com/..." className={inputCls} /></div>
            <div><label className={labelCls}>Recap / Blog URL</label><input value={form.recap_url} onChange={e => setField('recap_url', e.target.value)} placeholder="https://nodesudbury.com/blog/..." className={inputCls} /></div>
            <div><label className={labelCls}>Survey URL</label><input value={form.survey_url} onChange={e => setField('survey_url', e.target.value)} placeholder="https://forms.google.com/..." className={inputCls} /></div>
          </div>
        </div>

        <div className="col-span-2 flex items-center gap-3">
          <input type="checkbox" id="wap" checked={form.waitlist_auto_promote} onChange={e => setForm(prev => ({...prev, waitlist_auto_promote: e.target.checked}))} className="h-4 w-4 rounded border-[#252b3a] bg-[#0d1117] accent-[#38bdf8]" />
          <label htmlFor="wap" className="text-sm text-[#8892a4]">Auto-promote from waitlist when a spot opens</label>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving} className="px-5 py-2 rounded-md bg-[#38bdf8] text-black text-sm font-semibold disabled:opacity-50">
          {saving ? 'Saving...' : 'Save changes'}
        </button>
        <button type="button" onClick={() => router.push('/admin/events')} className="px-5 py-2 rounded-md border border-[#252b3a] text-sm text-[#8892a4] hover:text-white">
          Back to events
        </button>
      </div>
    </form>
  )
}

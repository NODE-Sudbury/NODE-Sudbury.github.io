'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Template = {
  id: string
  name: string
  description: string | null
  config: { type?: string; ticket_types?: unknown[]; max_capacity?: number }
}

type EventRow = {
  id: string
  title: string
  slug: string
  type: string
  status: string
  starts_at: string
}

const inputCls = 'w-full bg-[#0b0e14] border border-[#252b3a] rounded-md px-3 py-2 text-sm text-[#c9d1e8] focus:outline-none focus:ring-1 focus:ring-[#f0e6d3]/40'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function TemplatesAdmin() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)

  // "Use Template" modal state
  const [useModal, setUseModal] = useState<Template | null>(null)
  const [useForm, setUseForm] = useState({ title: '', starts_at: '', ends_at: '', location_id: '' })
  const [useSubmitting, setUseSubmitting] = useState(false)
  const [useError, setUseError] = useState('')

  // "Clone" state
  const [cloning, setCloning] = useState<string | null>(null)
  const [cloneMsg, setCloneMsg] = useState('')

  // "Save as Template" modal triggered from recent events
  const [saveModal, setSaveModal] = useState<EventRow | null>(null)
  const [saveForm, setSaveForm] = useState({ template_name: '', description: '' })
  const [saveSubmitting, setSaveSubmitting] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  useEffect(() => {
    fetch('/api/admin/templates')
      .then(r => r.json())
      .then(d => { setTemplates(d.templates ?? []); setEvents(d.events ?? []) })
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(id: string) {
    if (!confirm('Delete this template?')) return
    const res = await fetch('/api/admin/templates', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) setTemplates(prev => prev.filter(t => t.id !== id))
  }

  async function handleUseTemplate(e: React.FormEvent) {
    e.preventDefault()
    if (!useModal) return
    setUseSubmitting(true)
    setUseError('')
    const res = await fetch('/api/admin/events/from-template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_id: useModal.id, ...useForm, location_id: useForm.location_id || undefined }),
    })
    setUseSubmitting(false)
    if (res.ok) {
      const { event } = await res.json()
      router.push(`/admin/events`)
      setUseModal(null)
    } else {
      const d = await res.json().catch(() => ({}))
      setUseError(d.error ?? 'Failed to create event.')
    }
  }

  async function handleClone(eventId: string, title: string) {
    setCloning(eventId)
    setCloneMsg('')
    const res = await fetch(`/api/admin/events/${eventId}/clone`, { method: 'POST' })
    setCloning(null)
    if (res.ok) {
      const { event } = await res.json()
      setCloneMsg(`"${title}" cloned as draft. Redirecting...`)
      setTimeout(() => { router.push('/admin/events'); setCloneMsg('') }, 1500)
    } else {
      setCloneMsg('Clone failed.')
    }
  }

  async function handleSaveTemplate(e: React.FormEvent) {
    e.preventDefault()
    if (!saveModal) return
    setSaveSubmitting(true)
    setSaveMsg('')
    const res = await fetch(`/api/admin/events/${saveModal.id}/save-template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saveForm),
    })
    setSaveSubmitting(false)
    if (res.ok) {
      const { template } = await res.json()
      setTemplates(prev => [...prev, template])
      setSaveMsg('Template saved!')
      setTimeout(() => { setSaveModal(null); setSaveMsg('') }, 1500)
    } else {
      const d = await res.json().catch(() => ({}))
      setSaveMsg(d.error ?? 'Failed to save template.')
    }
  }

  if (loading) return <div className="text-sm text-[#5a6278]">Loading...</div>

  return (
    <div className="space-y-10">

      {/* Use Template Modal */}
      {useModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#13161f] border border-[#252b3a] rounded-lg p-6 w-full max-w-md space-y-4">
            <p className="text-sm font-semibold text-[#f0e6d3]">Create Event from Template</p>
            <p className="text-xs text-[#5a6278]">{useModal.name}</p>
            <form onSubmit={handleUseTemplate} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-[#5a6278]">Event Title *</Label>
                <input required value={useForm.title} onChange={e => setUseForm(f => ({ ...f, title: e.target.value }))} className={inputCls} placeholder="NODE Sudbury Workshop" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-[#5a6278]">Starts at</Label>
                  <input type="datetime-local" value={useForm.starts_at} onChange={e => setUseForm(f => ({ ...f, starts_at: e.target.value }))} className={inputCls} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-[#5a6278]">Ends at</Label>
                  <input type="datetime-local" value={useForm.ends_at} onChange={e => setUseForm(f => ({ ...f, ends_at: e.target.value }))} className={inputCls} />
                </div>
              </div>
              {useError && <p className="text-xs text-red-400">{useError}</p>}
              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={useSubmitting} size="sm" className="bg-[#f0e6d3] text-[#0b0e14] hover:bg-[#e8dcc8] font-semibold text-xs">
                  {useSubmitting ? 'Creating...' : 'Create as Draft'}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setUseModal(null)} className="text-[#5a6278] text-xs">Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Save as Template Modal */}
      {saveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#13161f] border border-[#252b3a] rounded-lg p-6 w-full max-w-md space-y-4">
            <p className="text-sm font-semibold text-[#f0e6d3]">Save as Template</p>
            <p className="text-xs text-[#5a6278]">Saving structure from: {saveModal.title}</p>
            <form onSubmit={handleSaveTemplate} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-[#5a6278]">Template Name *</Label>
                <input required value={saveForm.template_name} onChange={e => setSaveForm(f => ({ ...f, template_name: e.target.value }))} className={inputCls} placeholder="Monthly Meetup Template" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#5a6278]">Description (optional)</Label>
                <input value={saveForm.description} onChange={e => setSaveForm(f => ({ ...f, description: e.target.value }))} className={inputCls} placeholder="Standard meetup with 2 tickets" />
              </div>
              {saveMsg && <p className="text-xs text-green-400">{saveMsg}</p>}
              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={saveSubmitting} size="sm" className="bg-[#f0e6d3] text-[#0b0e14] hover:bg-[#e8dcc8] font-semibold text-xs">
                  {saveSubmitting ? 'Saving...' : 'Save Template'}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSaveModal(null)} className="text-[#5a6278] text-xs">Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Saved Templates */}
      <section>
        <h2 className="text-sm font-semibold text-[#f0e6d3] mb-4">Saved Templates ({templates.length})</h2>
        {templates.length === 0 ? (
          <div className="border border-[#252b3a] rounded-lg px-6 py-8 text-center">
            <p className="text-sm text-[#5a6278]">No templates yet. Save a recent event as a template to reuse its structure.</p>
          </div>
        ) : (
          <div className="border border-[#252b3a] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#252b3a] bg-[#13161f]">
                  {['Name', 'Type', 'Tickets', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#5a6278] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {templates.map((tmpl, i) => (
                  <tr key={tmpl.id} className={`border-b border-[#252b3a] last:border-0 ${i % 2 === 0 ? 'bg-[#0b0e14]' : 'bg-[#0d1018]'}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#c9d1e8]">{tmpl.name}</div>
                      {tmpl.description && <div className="text-xs text-[#5a6278]">{tmpl.description}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#5a6278] capitalize">{tmpl.config.type?.replace(/_/g, ' ') ?? 'meetup'}</td>
                    <td className="px-4 py-3 text-xs text-[#5a6278]">{tmpl.config.ticket_types?.length ?? 0} ticket type{(tmpl.config.ticket_types?.length ?? 0) !== 1 ? 's' : ''}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Button variant="outline" size="sm"
                          onClick={() => { setUseForm({ title: '', starts_at: '', ends_at: '', location_id: '' }); setUseError(''); setUseModal(tmpl) }}
                          className="h-6 px-2 text-[10px] border-green-500/30 text-green-400 hover:bg-green-500/10">
                          Use Template
                        </Button>
                        <Button variant="outline" size="sm"
                          onClick={() => handleDelete(tmpl.id)}
                          className="h-6 px-2 text-[10px] border-red-500/30 text-red-400 hover:bg-red-500/10">
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Clone Recent Events */}
      <section>
        <h2 className="text-sm font-semibold text-[#f0e6d3] mb-1">Clone a Recent Event</h2>
        <p className="text-xs text-[#5a6278] mb-4">Creates an identical draft with dates cleared.</p>
        {cloneMsg && (
          <div className="mb-3 text-sm bg-green-500/10 border border-green-500/30 text-green-400 rounded-md px-4 py-2">{cloneMsg}</div>
        )}
        {events.length === 0 ? (
          <div className="border border-[#252b3a] rounded-lg px-6 py-8 text-center">
            <p className="text-sm text-[#5a6278]">No published or archived events found.</p>
          </div>
        ) : (
          <div className="border border-[#252b3a] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#252b3a] bg-[#13161f]">
                  {['Event', 'Type', 'Date', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#5a6278] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((ev, i) => (
                  <tr key={ev.id} className={`border-b border-[#252b3a] last:border-0 ${i % 2 === 0 ? 'bg-[#0b0e14]' : 'bg-[#0d1018]'}`}>
                    <td className="px-4 py-3 font-medium text-[#c9d1e8] max-w-[200px]">
                      <div className="truncate">{ev.title}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#5a6278] capitalize">{ev.type.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-xs text-[#5a6278]">{fmtDate(ev.starts_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Button variant="outline" size="sm"
                          disabled={cloning === ev.id}
                          onClick={() => handleClone(ev.id, ev.title)}
                          className="h-6 px-2 text-[10px] border-sky-500/30 text-sky-400 hover:bg-sky-500/10">
                          {cloning === ev.id ? '...' : 'Clone'}
                        </Button>
                        <Button variant="outline" size="sm"
                          onClick={() => { setSaveForm({ template_name: '', description: '' }); setSaveMsg(''); setSaveModal(ev) }}
                          className="h-6 px-2 text-[10px] border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
                          Save as Template
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

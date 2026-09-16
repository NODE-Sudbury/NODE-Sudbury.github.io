'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

type Station = {
  id: string
  name: string
  hint_text: string | null
  points_value: number
  sort_order: number
  qr_token: string
}

type Hunt = {
  id: string
  title: string
  description: string | null
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
} | null

interface Props {
  eventId: string
  initialHunt: Hunt
  initialStations: Station[]
}

export default function HuntAdmin({ eventId, initialHunt, initialStations }: Props) {
  const [tab, setTab] = useState<'setup' | 'stations'>('setup')
  const [hunt, setHunt] = useState(initialHunt)
  const [stations, setStations] = useState<Station[]>(initialStations)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: hunt?.title ?? '',
    description: hunt?.description ?? '',
    is_active: hunt?.is_active ?? false,
    starts_at: hunt?.starts_at?.slice(0, 16) ?? '',
    ends_at: hunt?.ends_at?.slice(0, 16) ?? '',
  })

  const [stationForm, setStationForm] = useState({ name: '', hint_text: '', points_value: '10' })
  const [addingStation, setAddingStation] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  async function saveHunt(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/admin/hunt/${eventId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          is_active: form.is_active,
          starts_at: form.starts_at || null,
          ends_at: form.ends_at || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setMsg(data.error ?? 'Save failed'); return }
      setHunt(data.hunt)
      setMsg('Hunt saved.')
    } finally {
      setSaving(false)
    }
  }

  async function addStation(e: React.FormEvent) {
    e.preventDefault()
    if (!hunt) { setMsg('Save the hunt setup first.'); return }
    setAddingStation(true)
    setMsg(null)
    try {
      const nextOrder = stations.length
      const res = await fetch(`/api/admin/hunt/${eventId}/stations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hunt_id: hunt.id,
          name: stationForm.name,
          hint_text: stationForm.hint_text || null,
          points_value: parseInt(stationForm.points_value) || 10,
          sort_order: nextOrder,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setMsg(data.error ?? 'Add failed'); return }
      setStations(prev => [...prev, data.station])
      setStationForm({ name: '', hint_text: '', points_value: '10' })
    } finally {
      setAddingStation(false)
    }
  }

  function copyUrl(token: string) {
    const url = `${window.location.origin}/scan/${token}`
    navigator.clipboard.writeText(url)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-border pb-4">
        {(['setup', 'stations'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-sm font-medium pb-1 border-b-2 transition-colors capitalize ${tab === t ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {t === 'setup' ? 'Hunt Setup' : `Stations (${stations.length})`}
          </button>
        ))}
      </div>

      {msg && (
        <p className="text-sm text-muted-foreground bg-muted rounded px-3 py-2">{msg}</p>
      )}

      {tab === 'setup' && (
        <form onSubmit={saveHunt} className="space-y-4 max-w-lg">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Starts at</Label>
              <Input type="datetime-local" value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Ends at</Label>
              <Input type="datetime-local" value={form.ends_at} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
              className="rounded"
            />
            <Label htmlFor="is_active" className="cursor-pointer">Active (allow stamp collection)</Label>
          </div>
          <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Hunt'}</Button>
        </form>
      )}

      {tab === 'stations' && (
        <div className="space-y-6">
          {stations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stations yet. Add one below.</p>
          ) : (
            <div className="space-y-2">
              {stations.map((s, i) => (
                <div key={s.id} className="flex items-center gap-4 px-4 py-3 rounded-lg border border-border bg-card">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">/scan/{s.qr_token}</p>
                    {s.hint_text && <p className="text-xs text-muted-foreground italic">{s.hint_text}</p>}
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground shrink-0">{s.points_value} pts</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyUrl(s.qr_token)}
                    className="text-xs shrink-0"
                  >
                    {copied === s.qr_token ? 'Copied!' : 'Copy URL'}
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Separator />

          <form onSubmit={addStation} className="space-y-3 max-w-lg">
            <h3 className="text-sm font-semibold">Add Station</h3>
            <div className="space-y-1.5">
              <Label>Station name</Label>
              <Input
                value={stationForm.name}
                onChange={e => setStationForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Front entrance"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Hint text (optional)</Label>
              <Input
                value={stationForm.hint_text}
                onChange={e => setStationForm(f => ({ ...f, hint_text: e.target.value }))}
                placeholder="Clue to help attendees find this station"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Points value</Label>
              <Input
                type="number"
                min={1}
                value={stationForm.points_value}
                onChange={e => setStationForm(f => ({ ...f, points_value: e.target.value }))}
                className="w-28"
              />
            </div>
            <Button type="submit" disabled={addingStation || !hunt}>
              {addingStation ? 'Adding...' : 'Add Station'}
            </Button>
            {!hunt && <p className="text-xs text-muted-foreground">Save the hunt setup first.</p>}
          </form>
        </div>
      )}
    </div>
  )
}

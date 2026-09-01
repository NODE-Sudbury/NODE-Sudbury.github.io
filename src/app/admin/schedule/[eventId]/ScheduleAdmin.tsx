'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Track = { id: string; name: string; color: string; sort_order: number }
type Room = { id: string; name: string; capacity: number | null }
type Session = {
  id: string; track_id: string | null; room_id: string | null; title: string; description: string | null
  session_type: string; speaker_name: string | null; speaker_bio: string | null
  room: string | null; starts_at: string | null; ends_at: string | null
}
type Event = { id: string; title: string; slug: string; type: string }

const SESSION_TYPES = ['keynote','talk','workshop','panel','lightning_talk','break','lunch','networking','sponsor_demo','codelab']

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Toronto' })
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', timeZone: 'America/Toronto' })
}

export default function ScheduleAdmin({ event, initialTracks, initialSessions, initialRooms }: {
  event: Event; initialTracks: Track[]; initialSessions: Session[]; initialRooms: Room[]
}) {
  const [tab, setTab] = useState<'tracks'|'sessions'|'preview'>('tracks')
  const [tracks, setTracks] = useState<Track[]>(initialTracks)
  const [sessions, setSessions] = useState<Session[]>(initialSessions)
  const [rooms] = useState<Room[]>(initialRooms)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  // Track form state
  const [trackForm, setTrackForm] = useState({ name: '', color: '#38bdf8' })

  // Session form state
  const [sessForm, setSessForm] = useState({
    title: '', description: '', session_type: 'talk', track_id: '',
    speaker_name: '', speaker_bio: '', room: '', room_id: '', starts_at: '', ends_at: '',
  })

  async function addTrack(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setSaving(true)
    const res = await fetch(`/api/admin/schedule/${event.id}/tracks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trackForm.name, color: trackForm.color, sort_order: tracks.length }),
    })
    setSaving(false)
    if (!res.ok) { setErr((await res.json()).error); return }
    const t = await res.json()
    setTracks(prev => [...prev, t])
    setTrackForm({ name: '', color: '#38bdf8' })
  }

  async function deleteTrack(id: string) {
    if (!confirm('Delete this track? Sessions in it will become untracked.')) return
    const res = await fetch(`/api/admin/schedule/${event.id}/tracks/${id}`, { method: 'DELETE' })
    if (res.ok) setTracks(prev => prev.filter(t => t.id !== id))
  }

  async function addSession(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setSaving(true)
    const body: Record<string, string | null> = { ...sessForm }
    if (!body.track_id) body.track_id = null
    if (!body.starts_at) body.starts_at = null
    if (!body.ends_at) body.ends_at = null
    if (!body.room_id) body.room_id = null
    // If room_id is set, sync room name from the rooms list for display
    if (body.room_id) {
      const matched = rooms.find(r => r.id === body.room_id)
      if (matched && !body.room) body.room = matched.name
    }

    const res = await fetch(`/api/admin/schedule/${event.id}/sessions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    setSaving(false)
    if (!res.ok) { setErr((await res.json()).error); return }
    const s = await res.json()
    setSessions(prev => [...prev, s].sort((a, b) => (a.starts_at ?? '').localeCompare(b.starts_at ?? '')))
    setSessForm({ title: '', description: '', session_type: 'talk', track_id: '', speaker_name: '', speaker_bio: '', room: '', room_id: '', starts_at: '', ends_at: '' })
  }

  async function deleteSession(id: string) {
    if (!confirm('Delete this session?')) return
    const res = await fetch(`/api/admin/schedule/${event.id}/sessions/${id}`, { method: 'DELETE' })
    if (res.ok) setSessions(prev => prev.filter(s => s.id !== id))
  }

  const fieldClass = 'bg-[#13161f] border-[#252b3a] text-[#c9d1e8] placeholder:text-[#3a3f52] text-sm'

  return (
    <>
      <div className="max-w-4xl mx-auto py-8 px-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/events" className="text-sm text-[#5a6278] hover:text-[#c9d1e8]">Events</Link>
          <span className="text-[#3a3f52]">/</span>
          <span className="text-sm text-white font-medium">{event.title} - Schedule</span>
          <div className="ml-auto flex items-center gap-2">
            <Link href={`/admin/events/${event.id}/rooms`}>
              <Button variant="outline" size="sm" className="text-xs border-[#252b3a] text-[#5a6278]">Manage Rooms</Button>
            </Link>
            <Link href={`/events/${event.slug}/schedule`} target="_blank">
              <Button variant="outline" size="sm" className="text-xs border-[#252b3a] text-[#5a6278]">View public</Button>
            </Link>
          </div>
        </div>

        {err && <div className="mb-4 px-4 py-2 rounded bg-[#f7768e]/10 border border-[#f7768e]/20 text-[#f7768e] text-sm">{err}</div>}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-[#252b3a]">
          {(['tracks','sessions','preview'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                tab === t ? 'border-[#38bdf8] text-[#38bdf8]' : 'border-transparent text-[#5a6278] hover:text-[#c9d1e8]'
              }`}
            >{t}</button>
          ))}
        </div>

        {/* ── Tracks tab ── */}
        {tab === 'tracks' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-white mb-3">Tracks ({tracks.length})</h2>
              {tracks.length === 0 ? (
                <p className="text-sm text-[#5a6278]">No tracks yet. Add your first track below.</p>
              ) : (
                <div className="space-y-2">
                  {tracks.map(t => (
                    <div key={t.id} className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[#252b3a] bg-[#13161f]">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                      <span className="text-sm text-white flex-1">{t.name}</span>
                      <span className="text-xs text-[#3a3f52] font-mono">{t.color}</span>
                      <button onClick={() => deleteTrack(t.id)} className="text-xs text-[#f7768e] hover:underline ml-2">Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={addTrack} className="space-y-3 border border-[#252b3a] rounded-lg p-4 bg-[#0d1018]">
              <h3 className="text-sm font-semibold text-white">Add Track</h3>
              <div className="flex gap-3">
                <Input
                  placeholder="Track name (e.g. AI/ML, Web Dev)"
                  value={trackForm.name}
                  onChange={e => setTrackForm(f => ({ ...f, name: e.target.value }))}
                  className={`${fieldClass} flex-1`}
                  required
                />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-[#5a6278]">Color</label>
                  <input
                    type="color"
                    value={trackForm.color}
                    onChange={e => setTrackForm(f => ({ ...f, color: e.target.value }))}
                    className="w-10 h-8 rounded border border-[#252b3a] cursor-pointer bg-transparent"
                  />
                </div>
              </div>
              <Button type="submit" size="sm" disabled={saving} className="bg-[#38bdf8] text-[#0b0e14] hover:bg-[#7dd3fc] font-semibold">
                {saving ? 'Adding...' : 'Add Track'}
              </Button>
            </form>
          </div>
        )}

        {/* ── Sessions tab ── */}
        {tab === 'sessions' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-white mb-3">Sessions ({sessions.length})</h2>
              {sessions.length === 0 ? (
                <p className="text-sm text-[#5a6278]">No sessions yet.</p>
              ) : (
                <div className="space-y-2">
                  {sessions.map(s => {
                    const track = tracks.find(t => t.id === s.track_id)
                    const assignedRoom = rooms.find(r => r.id === s.room_id)
                    const roomLabel = assignedRoom ? assignedRoom.name : s.room
                    return (
                      <div key={s.id} className="flex items-start gap-3 px-4 py-3 rounded-lg border border-[#252b3a] bg-[#13161f]">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium">{s.title}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-[#5a6278] uppercase">{s.session_type}</span>
                            {track && <span className="text-[10px] font-medium" style={{ color: track.color }}>{track.name}</span>}
                            {roomLabel && <span className="text-[10px] text-[#3a3f52]">{roomLabel}</span>}
                            {s.starts_at && <span className="text-[10px] text-[#3a3f52]">{fmtDate(s.starts_at)} {fmtTime(s.starts_at)}</span>}
                            {s.speaker_name && <span className="text-[10px] text-[#5a6278]">{s.speaker_name}</span>}
                          </div>
                        </div>
                        <button onClick={() => deleteSession(s.id)} className="text-xs text-[#f7768e] hover:underline shrink-0">Remove</button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <form onSubmit={addSession} className="space-y-3 border border-[#252b3a] rounded-lg p-4 bg-[#0d1018]">
              <h3 className="text-sm font-semibold text-white">Add Session</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input placeholder="Session title *" value={sessForm.title}
                  onChange={e => setSessForm(f => ({ ...f, title: e.target.value }))}
                  className={fieldClass} required />
                <select value={sessForm.session_type}
                  onChange={e => setSessForm(f => ({ ...f, session_type: e.target.value }))}
                  className={`h-9 rounded-md px-3 ${fieldClass} border`}>
                  {SESSION_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
                <select value={sessForm.track_id}
                  onChange={e => setSessForm(f => ({ ...f, track_id: e.target.value }))}
                  className={`h-9 rounded-md px-3 ${fieldClass} border`}>
                  <option value="">No track (all-tracks)</option>
                  {tracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <div>
                  {rooms.length > 0 ? (
                    <>
                      <label className="text-xs text-[#5a6278] mb-1 block">Room</label>
                      <select
                        value={sessForm.room_id}
                        onChange={e => {
                          const rid = e.target.value
                          const matched = rooms.find(r => r.id === rid)
                          setSessForm(f => ({ ...f, room_id: rid, room: matched ? matched.name : f.room }))
                        }}
                        className={`h-9 rounded-md px-3 ${fieldClass} border`}
                      >
                        <option value="">No room assigned</option>
                        {rooms.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.name}{r.capacity ? ` (cap. ${r.capacity})` : ''}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <Input placeholder="Room / location" value={sessForm.room}
                      onChange={e => setSessForm(f => ({ ...f, room: e.target.value }))}
                      className={fieldClass} />
                  )}
                </div>
                <div>
                  <label className="text-xs text-[#5a6278] mb-1 block">Start time</label>
                  <Input type="datetime-local" value={sessForm.starts_at}
                    onChange={e => setSessForm(f => ({ ...f, starts_at: e.target.value }))}
                    className={fieldClass} />
                </div>
                <div>
                  <label className="text-xs text-[#5a6278] mb-1 block">End time</label>
                  <Input type="datetime-local" value={sessForm.ends_at}
                    onChange={e => setSessForm(f => ({ ...f, ends_at: e.target.value }))}
                    className={fieldClass} />
                </div>
                <Input placeholder="Speaker name" value={sessForm.speaker_name}
                  onChange={e => setSessForm(f => ({ ...f, speaker_name: e.target.value }))}
                  className={fieldClass} />
              </div>
              <textarea placeholder="Session description" value={sessForm.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSessForm(f => ({ ...f, description: e.target.value }))}
                className={`${fieldClass} min-h-[60px] w-full rounded-md border px-3 py-2 resize-none`} />
              <textarea placeholder="Speaker bio (optional)" value={sessForm.speaker_bio}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSessForm(f => ({ ...f, speaker_bio: e.target.value }))}
                className={`${fieldClass} min-h-[60px] w-full rounded-md border px-3 py-2 resize-none`} />
              <Button type="submit" size="sm" disabled={saving} className="bg-[#38bdf8] text-[#0b0e14] hover:bg-[#7dd3fc] font-semibold">
                {saving ? 'Adding...' : 'Add Session'}
              </Button>
            </form>
          </div>
        )}

        {/* ── Preview tab ── */}
        {tab === 'preview' && (
          <div>
            <p className="text-sm text-[#5a6278] mb-4">
              Preview of the schedule. <Link href={`/events/${event.slug}/schedule`} target="_blank" className="text-[#38bdf8] hover:underline">View public page</Link>
            </p>
            {sessions.length === 0 ? (
              <p className="text-sm text-[#5a6278]">No sessions added yet.</p>
            ) : (
              <div className="space-y-1">
                {sessions
                  .filter(s => s.starts_at)
                  .sort((a, b) => (a.starts_at ?? '').localeCompare(b.starts_at ?? ''))
                  .map(s => {
                    const track = tracks.find(t => t.id === s.track_id)
                    return (
                      <div key={s.id} className="flex gap-4 items-start">
                        <span className="text-xs text-[#5a6278] tabular-nums w-28 shrink-0 pt-3 text-right">
                          {s.starts_at ? fmtTime(s.starts_at) : ''}
                        </span>
                        <div className="flex-1 px-3 py-2.5 rounded-lg border border-[#252b3a] bg-[#13161f]">
                          <p className="text-sm font-medium text-white">{s.title}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[10px] uppercase text-[#5a6278]">{s.session_type.replace('_',' ')}</span>
                            {track && <span className="text-[10px] font-medium" style={{ color: track.color }}>{track.name}</span>}
                            {s.room && <span className="text-[10px] text-[#3a3f52]">{s.room}</span>}
                            {s.speaker_name && <span className="text-[10px] text-[#5a6278]">{s.speaker_name}</span>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

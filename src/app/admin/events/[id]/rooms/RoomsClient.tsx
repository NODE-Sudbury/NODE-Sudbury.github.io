'use client'

import { useState } from 'react'
import Link from 'next/link'

type Room = {
  id: string
  name: string
  capacity: number | null
  notes: string | null
  created_at: string
  session_count: number
}

const inputCls = 'w-full rounded-md border border-[#252b3a] bg-[#0d1117] px-3 py-2 text-sm text-white placeholder:text-[#4a5568] focus:outline-none focus:ring-1 focus:ring-[#38bdf8]'
const labelCls = 'block text-xs font-medium text-[#8892a4] mb-1'

export default function RoomsClient({
  eventId,
  eventTitle,
  initialRooms,
}: {
  eventId: string
  eventTitle: string
  initialRooms: Room[]
}) {
  const [rooms, setRooms] = useState<Room[]>(initialRooms)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const [form, setForm] = useState({
    name: '',
    capacity: '',
    notes: '',
  })

  async function addRoom(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setSaving(true)
    const res = await fetch(`/api/admin/events/${eventId}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        capacity: form.capacity ? parseInt(form.capacity, 10) : null,
        notes: form.notes || null,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setErr(body.error ?? 'Failed to create room')
      return
    }
    const newRoom = await res.json()
    setRooms(prev => [...prev, { ...newRoom, session_count: 0 }])
    setForm({ name: '', capacity: '', notes: '' })
  }

  async function deleteRoom(roomId: string) {
    if (!confirm('Delete this room? Affected sessions will have their room cleared.')) return
    const res = await fetch(`/api/admin/events/${eventId}/rooms/${roomId}`, { method: 'DELETE' })
    if (res.ok) {
      setRooms(prev => prev.filter(r => r.id !== roomId))
    } else {
      const body = await res.json().catch(() => ({}))
      setErr(body.error ?? 'Failed to delete room')
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1117]">
      <div className="max-w-4xl mx-auto py-8 px-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link href="/admin/events" className="text-[#8892a4] hover:text-white transition-colors">
            Events
          </Link>
          <span className="text-[#252b3a]">/</span>
          <Link href={`/admin/events`} className="text-[#8892a4] hover:text-white transition-colors">
            {eventTitle}
          </Link>
          <span className="text-[#252b3a]">/</span>
          <span className="text-white font-medium">Rooms</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">Room / Venue Management</h1>
            <p className="text-sm text-[#8892a4] mt-1">Define rooms or spaces for this event, then assign sessions to them in the schedule.</p>
          </div>
        </div>

        {err && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {err}
          </div>
        )}

        {/* Rooms table */}
        <div className="bg-[#13161f] border border-[#252b3a] rounded-lg overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-[#252b3a]">
            <h2 className="text-sm font-semibold text-white">
              Rooms
              <span className="ml-2 text-xs font-normal text-[#8892a4]">({rooms.length})</span>
            </h2>
          </div>

          {rooms.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-[#8892a4]">
              No rooms added yet. Use the form below to create your first room.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#252b3a]">
                    <th className="text-left px-5 py-3 text-xs font-medium text-[#8892a4] uppercase tracking-wide">Name</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-[#8892a4] uppercase tracking-wide">Capacity</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-[#8892a4] uppercase tracking-wide">Notes</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-[#8892a4] uppercase tracking-wide">Sessions</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map(room => (
                    <tr key={room.id} className="border-b border-[#252b3a] last:border-0 hover:bg-[#0d1117]/40 transition-colors">
                      <td className="px-5 py-3 text-white font-medium">{room.name}</td>
                      <td className="px-5 py-3 text-[#e2e8f0]">
                        {room.capacity != null ? room.capacity.toLocaleString() : <span className="text-[#8892a4]">-</span>}
                      </td>
                      <td className="px-5 py-3 text-[#8892a4] max-w-xs truncate">
                        {room.notes || <span className="text-[#252b3a]">-</span>}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          room.session_count > 0
                            ? 'bg-[#38bdf8]/10 text-[#38bdf8]'
                            : 'bg-[#252b3a] text-[#8892a4]'
                        }`}>
                          {room.session_count} session{room.session_count !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => deleteRoom(room.id)}
                          className="text-xs text-red-400 hover:text-red-300 hover:underline transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add room form */}
        <div className="bg-[#13161f] border border-[#252b3a] rounded-lg p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Add Room</h2>
          <form onSubmit={addRoom} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Room Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  className={inputCls}
                  placeholder="e.g. Main Stage, Room A, Workshop Space"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Capacity</label>
                <input
                  type="number"
                  className={inputCls}
                  placeholder="e.g. 200"
                  min="1"
                  value={form.capacity}
                  onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Notes</label>
              <textarea
                className={`${inputCls} min-h-[72px] resize-none`}
                placeholder="AV equipment, accessibility notes, location details..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-md bg-[#38bdf8] text-black text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#7dd3fc] transition-colors"
              >
                {saving ? 'Adding...' : 'Add Room'}
              </button>
              <Link
                href="/admin/events"
                className="px-5 py-2 rounded-md border border-[#252b3a] text-sm text-[#8892a4] hover:text-white transition-colors"
              >
                Back to Events
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

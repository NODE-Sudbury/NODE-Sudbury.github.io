'use client'

import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import { useState } from 'react'
import Link from 'next/link'

interface Template { id: string; name: string; description: string | null; quiz_questions: [{ count: number }] | null }
interface Room {
  id: string
  pin: string
  status: 'waiting' | 'active' | 'ended'
  started_at: string | null
  ended_at: string | null
  quiz_templates: { name: string } | null
  quiz_participants: [{ count: number }] | null
}

interface Props {
  event: { id: string; title: string; slug: string }
  initialRooms: Room[]
  templates: Template[]
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  waiting: { label: 'Waiting', color: 'text-amber-400' },
  active:  { label: 'Live',    color: 'text-green-400' },
  ended:   { label: 'Ended',   color: 'text-[#5a6278]' },
}

export default function QuizAdmin({ event, initialRooms, templates }: Props) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [rooms, setRooms] = useState<Room[]>(initialRooms)
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]?.id ?? '')
  const [creating, setCreating] = useState(false)
  const [ending, setEnding] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function createRoom() {
    if (!selectedTemplate) return
    setCreating(true); setError(null)
    const res = await fetch('/api/quiz/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: event.id, template_id: selectedTemplate }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to create room'); setCreating(false); return }
    setRooms(prev => [data, ...prev])
    setCreating(false)
  }

  async function endRoom(roomId: string) {
    setEnding(roomId)
    const res = await fetch(`/api/quiz/${roomId}/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'end' }),
    })
    if (res.ok) {
      setRooms(prev => prev.map(r => r.id === roomId ? { ...r, status: 'ended', ended_at: new Date().toISOString() } : r))
    }
    setEnding(null)
  }

  const activeRooms = rooms.filter(r => r.status !== 'ended')
  const pastRooms   = rooms.filter(r => r.status === 'ended')

  return (
    <div className="min-h-screen bg-[#0b0e14] text-[#c9d1e8] py-10 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <Link href="/admin/events" className="text-xs text-[#5a6278] hover:text-[#c9d1e8] transition-colors">
            Admin / Events
          </Link>
          <span className="mx-2 text-[#5a6278]">/</span>
          <span className="text-xs text-[#5a6278]">{event.title}</span>
          <h1 className="text-xl font-semibold text-white mt-2">Quiz Rooms</h1>
          <p className="text-sm text-[#5a6278] mt-0.5">
            Create live quiz sessions for attendees to join with a PIN.
          </p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-[#f7768e]/10 border border-[#f7768e]/30 text-[#f7768e] text-sm">
            {error}
          </div>
        )}

        {/* Create room */}
        <div className="bg-[#13161f] border border-[#252b3a] rounded-xl p-5 mb-8">
          <h2 className="text-sm font-medium text-white mb-3">Launch a new quiz room</h2>
          {templates.length === 0 ? (
            <p className="text-sm text-[#5a6278]">
              No quiz templates yet.{' '}
              <Link href="/admin/quiz" className="text-[#7aa2f7] hover:underline">
                Create one first
              </Link>
            </p>
          ) : (
            <div className="flex gap-3 flex-wrap">
              <select
                value={selectedTemplate}
                onChange={e => setSelectedTemplate(e.target.value)}
                className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-[#0b0e14] border border-[#252b3a] text-sm text-[#c9d1e8]"
              >
                {templates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.quiz_questions?.[0]?.count ?? 0} questions)
                  </option>
                ))}
              </select>
              <button
                onClick={createRoom}
                disabled={creating || !selectedTemplate}
                className="px-4 py-2 rounded-lg bg-[#7aa2f7] text-[#0b0e14] text-sm font-medium hover:bg-[#a0c0ff] transition-colors disabled:opacity-40"
              >
                {creating ? 'Creating...' : 'Create Room'}
              </button>
            </div>
          )}
        </div>

        {/* Active rooms */}
        {activeRooms.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs font-mono uppercase tracking-widest text-[#5a6278] mb-3">Active Rooms</h2>
            <div className="space-y-3">
              {activeRooms.map(room => {
                const s = STATUS_LABEL[room.status]
                const participants = room.quiz_participants?.[0]?.count ?? 0
                return (
                  <div key={room.id} className="bg-[#13161f] border border-[#252b3a] rounded-xl p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium ${s.color}`}>{s.label}</span>
                        <span className="text-[#5a6278] text-xs">PIN:</span>
                        <span className="font-mono text-lg font-bold text-white tracking-widest">{room.pin}</span>
                      </div>
                      <p className="text-xs text-[#5a6278]">
                        {room.quiz_templates?.name ?? 'Unknown template'} - {participants} participant{participants !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Link
                        href={`/quiz/${room.id}`}
                        target="_blank"
                        className="px-3 py-1.5 rounded-md bg-[#252b3a] text-xs text-[#c9d1e8] hover:bg-[#2e3550] transition-colors"
                      >
                        Open Room
                      </Link>
                      {room.status !== 'ended' && (
                        <button
                          onClick={() => endRoom(room.id)}
                          disabled={ending === room.id}
                          className="px-3 py-1.5 rounded-md bg-[#f7768e]/10 border border-[#f7768e]/30 text-xs text-[#f7768e] hover:bg-[#f7768e]/20 transition-colors disabled:opacity-40"
                        >
                          {ending === room.id ? 'Ending...' : 'End'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Past rooms */}
        {pastRooms.length > 0 && (
          <div>
            <h2 className="text-xs font-mono uppercase tracking-widest text-[#5a6278] mb-3">Past Rooms</h2>
            <div className="space-y-2">
              {pastRooms.map(room => {
                const participants = room.quiz_participants?.[0]?.count ?? 0
                return (
                  <div key={room.id} className="bg-[#13161f] border border-[#252b3a] rounded-xl p-4 flex items-center gap-4 opacity-60">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#5a6278]">PIN {room.pin}</span>
                        <span className="text-[#5a6278] text-xs">-</span>
                        <span className="text-xs text-[#5a6278]">{room.quiz_templates?.name ?? 'Unknown'}</span>
                        <span className="text-[#5a6278] text-xs">-</span>
                        <span className="text-xs text-[#5a6278]">{participants} player{participants !== 1 ? 's' : ''}</span>
                      </div>
                      {room.ended_at && (
                        <p className="text-xs text-[#5a6278] mt-0.5">
                          Ended {new Date(room.ended_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/quiz/${room.id}`}
                      target="_blank"
                      className="px-3 py-1.5 rounded-md bg-[#252b3a] text-xs text-[#c9d1e8] hover:bg-[#2e3550] transition-colors shrink-0"
                    >
                      Results
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {rooms.length === 0 && (
          <div className="text-center py-16 text-[#5a6278]">
            <p className="text-sm">No quiz rooms yet. Create one above to get started.</p>
          </div>
        )}

      </div>
    </div>
  )
}

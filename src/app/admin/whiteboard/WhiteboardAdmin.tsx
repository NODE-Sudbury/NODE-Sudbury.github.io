'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type WBSession = {
  id: string
  title: string
  is_active: boolean
  event_id: string | null
  created_at: string
  event: { title: string } | null
}

type Event = { id: string; title: string }

export function WhiteboardAdmin({ sessions: initial, events }: { sessions: WBSession[]; events: Event[] }) {
  const [sessions, setSessions] = useState<WBSession[]>(initial)
  const [title, setTitle] = useState('')
  const [eventId, setEventId] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/admin/whiteboard/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), event_id: eventId || null }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed'); return }
      setSessions(prev => [data.session, ...prev])
      setTitle('')
      setEventId('')
    } catch {
      setError('Network error')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-foreground">Whiteboards</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage collaborative whiteboard sessions for events.</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-sm font-semibold mb-4">Create Session</h2>
          <form onSubmit={handleCreate} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-48">
              <label className="text-xs text-muted-foreground mb-1 block">Title</label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Hackathon Ideation Board"
                required
              />
            </div>
            <div className="min-w-48">
              <label className="text-xs text-muted-foreground mb-1 block">Event (optional)</label>
              <select
                value={eventId}
                onChange={e => setEventId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">No event</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.title}</option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={creating} size="sm">
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </form>
          {error && <p className="text-xs text-destructive mt-2">{error}</p>}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {sessions.length === 0 && (
          <p className="text-sm text-muted-foreground">No whiteboard sessions yet.</p>
        )}
        {sessions.map(s => (
          <div key={s.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div>
              <p className="text-sm font-medium text-foreground">{s.title}</p>
              <p className="text-xs text-muted-foreground">
                {s.event ? `Event: ${s.event.title}` : 'No event'}
                {' · '}
                {new Date(s.created_at).toLocaleDateString('en-CA')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={s.is_active ? 'default' : 'secondary'} className="text-[10px]">
                {s.is_active ? 'Active' : 'Inactive'}
              </Badge>
              <Link href={`/whiteboard/${s.id}`} target="_blank">
                <Button variant="outline" size="sm" className="text-xs">Open</Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

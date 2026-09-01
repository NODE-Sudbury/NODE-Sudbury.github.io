'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Notif {
  id: string
  type: string
  title: string
  body: string | null
  ref_type: string | null
  ref_id: string | null
  is_read: boolean
  created_at: string
}

interface Props {
  notifications: Notif[]
  memberId: string
}

export default function NotificationsClient({ notifications: initial, memberId }: Props) {
  const [items, setItems] = useState(initial)
  const [loading, setLoading] = useState(false)

  async function markAllRead() {
    setLoading(true)
    await fetch('/api/notifications/read', { method: 'POST', body: JSON.stringify({ all: true }) })
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setLoading(false)
  }

  async function markOne(id: string) {
    await fetch('/api/notifications/read', { method: 'POST', body: JSON.stringify({ id }) })
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
  }

  const unreadCount = items.filter((n) => !n.is_read).length

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8 max-w-2xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-muted-foreground text-sm mt-1">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} disabled={loading} className="text-xs border-[#252b3a]">
            Mark all read
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notifications yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => { if (!n.is_read) markOne(n.id) }}
              className={`w-full text-left p-4 rounded-lg border transition-colors ${
                n.is_read ? 'bg-[#0b0e14] border-[#252b3a]' : 'bg-[#13161f] border-[#f0e6d3]/20'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-[#f0e6d3] shrink-0 mt-0.5" />}
                    <p className="text-sm font-semibold">{n.title}</p>
                  </div>
                  {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0 capitalize">{n.type.replace(/_/g, ' ')}</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                {new Date(n.created_at).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </button>
          ))}
        </div>
      )}

      <div className="mt-8">
        <a href="/dashboard/settings/notifications" className="text-xs text-[#f0e6d3] hover:underline">
          Notification preferences
        </a>
      </div>
    </div>
  )
}

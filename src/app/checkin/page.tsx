'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'

export default function CheckinIndex() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('events')
      .select('id, title, starts_at, ends_at, location, capacity')
      .gte('starts_at', new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString()) // include events started within last 12h
      .order('starts_at')
      .then(({ data }) => {
        setEvents(data ?? [])
        setLoading(false)
      })
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Select event</h1>
        <p className="text-sm text-muted-foreground mt-1">Tap an event to open its check-in list.</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : events.length === 0 ? (
        <div className="border border-border rounded-lg p-8 text-center">
          <p className="text-sm text-muted-foreground">No upcoming events found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => (
            <Link
              key={ev.id}
              href={`/checkin/${ev.id}`}
              className="block border border-border rounded-lg px-5 py-4 hover:bg-muted/30 transition-colors"
            >
              <p className="font-medium text-sm">{ev.title}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(ev.starts_at).toLocaleDateString('en-CA', {
                  weekday: 'short', month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
                {ev.location && ` · ${ev.location}`}
                {ev.capacity && ` · capacity ${ev.capacity}`}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

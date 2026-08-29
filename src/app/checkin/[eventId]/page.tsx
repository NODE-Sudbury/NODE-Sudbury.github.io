'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

interface Attendee {
  rsvp_id: string
  member_id: string
  full_name: string | null
  avatar_url: string | null
  checked_in_at: string | null
}

export default function CheckinEvent() {
  const { eventId } = useParams<{ eventId: string }>()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [event, setEvent] = useState<any>(null)
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [{ data: ev }, { data: rsvps }] = await Promise.all([
      supabase.from('events').select('id, title, starts_at, capacity').eq('id', eventId).single(),
      supabase.from('rsvps')
        .select('id, member_id, checked_in_at, members(full_name, avatar_url)')
        .eq('event_id', eventId)
        .order('members(full_name)'),
    ])
    setEvent(ev)
    setAttendees(
      (rsvps ?? []).map((r: any) => ({
        rsvp_id: r.id,
        member_id: r.member_id,
        full_name: r.members?.full_name ?? null,
        avatar_url: r.members?.avatar_url ?? null,
        checked_in_at: r.checked_in_at ?? null,
      }))
    )
    setLoading(false)
  }, [eventId])

  useEffect(() => { load() }, [load])

  async function toggleCheckin(rsvpId: string, currentlyCheckedIn: boolean) {
    setChecking(rsvpId)
    const checked_in_at = currentlyCheckedIn ? null : new Date().toISOString()
    await supabase.from('rsvps').update({ checked_in_at }).eq('id', rsvpId)
    setAttendees((prev) =>
      prev.map((a) => a.rsvp_id === rsvpId ? { ...a, checked_in_at } : a)
    )
    setChecking(null)
  }

  const filtered = attendees.filter((a) =>
    !search || a.full_name?.toLowerCase().includes(search.toLowerCase())
  )
  const checkedInCount = attendees.filter((a) => a.checked_in_at).length

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  return (
    <div className="space-y-5">
      {/* Back + event header */}
      <div>
        <Link href="/checkin" className="text-xs text-muted-foreground hover:text-foreground">
          ← All events
        </Link>
        <h1 className="text-lg font-semibold mt-2">{event?.title}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {new Date(event?.starts_at).toLocaleDateString('en-CA', {
            weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
        </p>
        <p className="text-sm font-medium mt-2">
          {checkedInCount} / {attendees.length} checked in
          {event?.capacity && ` (capacity ${event.capacity})`}
        </p>
      </div>

      {/* Search */}
      <Input
        placeholder="Search attendee name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full"
        autoFocus
      />

      {/* Attendee list */}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {search ? 'No attendees match that name.' : 'No RSVPs yet.'}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => {
            const initials = a.full_name?.split(' ').map((n) => n[0]).join('').toUpperCase() ?? '?'
            const checkedIn = !!a.checked_in_at
            return (
              <div
                key={a.rsvp_id}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                  checkedIn
                    ? 'border-[#f0e6d3]/30 bg-[#f0e6d3]/5'
                    : 'border-border bg-transparent'
                }`}
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={a.avatar_url ?? undefined} />
                  <AvatarFallback className="text-sm">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.full_name ?? 'Unknown'}</p>
                  {checkedIn && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Checked in {new Date(a.checked_in_at!).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => toggleCheckin(a.rsvp_id, checkedIn)}
                  disabled={checking === a.rsvp_id}
                  className={`shrink-0 px-4 py-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-50 ${
                    checkedIn
                      ? 'bg-muted text-muted-foreground hover:bg-muted/80'
                      : 'bg-[#f0e6d3] text-[#0a0a0a] hover:bg-[#e8d9c0]'
                  }`}
                >
                  {checking === a.rsvp_id ? '...' : checkedIn ? 'Undo' : 'Check in'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

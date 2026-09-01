'use client'

import { useEffect, useState, useCallback } from 'react'

interface Slot {
  id: string
  mentor_member_id: string
  starts_at: string
  ends_at: string
  booked_by_member_id: string | null
  booked_at: string | null
  notes: string | null
}

interface MentorSlotPickerProps {
  eventSlug: string
  mentorId: string
  mentorName: string
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRange(starts: string, ends: string) {
  const s = new Date(starts)
  const e = new Date(ends)
  const day = s.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  const start = s.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  const end = e.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  return `${day} - ${start} to ${end}`
}

export default function MentorSlotPicker({
  eventSlug,
  mentorId,
  mentorName,
}: MentorSlotPickerProps) {
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState<string | null>(null)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchSlots = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = `/api/events/${eventSlug}/mentors/slots?mentor_id=${encodeURIComponent(mentorId)}`
      const res = await fetch(url)
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to load slots.')
      } else {
        setSlots(json.slots ?? [])
        setNote(json.note ?? null)
      }
    } catch {
      setError('Network error loading slots.')
    } finally {
      setLoading(false)
    }
  }, [eventSlug, mentorId])

  useEffect(() => {
    fetchSlots()
  }, [fetchSlots])

  async function bookSlot(slot: Slot) {
    setBookingId(slot.id)
    setConfirmMsg(null)
    setError(null)
    try {
      const res = await fetch(
        `/api/events/${eventSlug}/mentors/slots/${slot.id}/book`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } }
      )
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Booking failed.')
      } else {
        setConfirmMsg(`Session booked for ${formatTime(slot.starts_at)}`)
        // Refresh slots to reflect updated state
        await fetchSlots()
      }
    } catch {
      setError('Network error during booking.')
    } finally {
      setBookingId(null)
    }
  }

  return (
    <div style={{ background: '#0d1117', minHeight: '100%' }}>
      <div className="bg-[#13161f] border border-[#252b3a] rounded-lg p-6">
        <h2 className="text-lg font-semibold text-[#e2e8f0] mb-1">
          Office Hours with {mentorName}
        </h2>
        <p className="text-xs text-[#8892a4] mb-5">
          Select an available time slot to book a one-on-one session.
        </p>

        {confirmMsg && (
          <div className="mb-4 rounded-md border border-[#38bdf8]/40 bg-[#38bdf8]/10 px-4 py-3 text-sm text-[#38bdf8]">
            {confirmMsg}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {note && (
          <div className="mb-4 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-300">
            {note}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-[#8892a4]">Loading slots...</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-[#8892a4]">
            No office hours slots available yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {slots.map((slot) => {
              const isBooked = Boolean(slot.booked_by_member_id)
              const isBookingThis = bookingId === slot.id
              return (
                <li
                  key={slot.id}
                  className="flex items-center justify-between gap-4 rounded-md border border-[#252b3a] bg-[#0d1117] px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-[#e2e8f0] font-medium leading-tight">
                      {formatRange(slot.starts_at, slot.ends_at)}
                    </p>
                    {slot.notes && (
                      <p className="mt-0.5 text-xs text-[#8892a4] truncate">
                        {slot.notes}
                      </p>
                    )}
                  </div>

                  {isBooked ? (
                    <span className="shrink-0 rounded-full border border-[#252b3a] bg-[#13161f] px-3 py-1 text-xs font-medium text-[#8892a4]">
                      Booked
                    </span>
                  ) : (
                    <button
                      onClick={() => bookSlot(slot)}
                      disabled={isBookingThis || bookingId !== null}
                      className="shrink-0 px-5 py-2 rounded-md bg-[#38bdf8] text-black text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#7dd3fc] transition-colors"
                    >
                      {isBookingThis ? 'Booking...' : 'Book'}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

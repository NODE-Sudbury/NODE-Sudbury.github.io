'use client'

import { useState, useTransition } from 'react'

type Registration = {
  id: string
  status: string
  checked_in_at: string | null
  created_at: string
  attendance_mode: string
  waitlist_position: number | null
  members: { id: string; full_name: string; email: string; avatar_url: string | null } | null
  ticket_types: { id: string; name: string } | null
}

type Props = {
  registrations: Registration[]
  eventId: string
  maxCapacity: number | null
}

type FilterTab = 'all' | 'confirmed' | 'waitlisted' | 'cancelled' | 'checked_in'

export default function RegistrationsAdmin({ registrations, eventId, maxCapacity }: Props) {
  const [list, setList] = useState(registrations)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()

  const filtered = list.filter((r) => {
    const matchesFilter = filter === 'all' || r.status === filter
    const q = search.toLowerCase()
    const name = r.members?.full_name?.toLowerCase() ?? ''
    const email = r.members?.email?.toLowerCase() ?? ''
    return matchesFilter && (q === '' || name.includes(q) || email.includes(q))
  })

  const counts = {
    all: list.length,
    confirmed: list.filter((r) => r.status === 'confirmed').length,
    waitlisted: list.filter((r) => r.status === 'waitlisted').length,
    cancelled: list.filter((r) => r.status === 'cancelled').length,
    checked_in: list.filter((r) => r.status === 'checked_in' || r.checked_in_at).length,
  }

  async function handleCheckin(regId: string, checkedIn: boolean) {
    startTransition(async () => {
      const res = await fetch(`/api/admin/events/${eventId}/checkin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_id: regId, checked_in: checkedIn }),
      })
      if (res.ok) {
        setList((prev) =>
          prev.map((r) =>
            r.id === regId
              ? {
                  ...r,
                  status: checkedIn ? 'checked_in' : 'confirmed',
                  checked_in_at: checkedIn ? new Date().toISOString() : null,
                }
              : r
          )
        )
      }
    })
  }

  const checkedInCount = counts.checked_in
  const confirmedTotal = counts.confirmed + counts.checked_in

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat label="Registered" value={counts.confirmed + counts.checked_in} />
        <Stat label="Waitlisted" value={counts.waitlisted} />
        <Stat label="Checked in" value={checkedInCount} />
        <Stat label="Capacity" value={maxCapacity != null ? `${confirmedTotal} / ${maxCapacity}` : String(confirmedTotal)} />
      </div>

      <div className="flex gap-1 mb-4 flex-wrap">
        {(['all', 'confirmed', 'waitlisted', 'checked_in', 'cancelled'] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
              filter === tab
                ? 'bg-[#7aa2f7] text-[#0b0e14] font-semibold'
                : 'bg-[#1a2035] text-[#5a6278] hover:text-[#c9d1e8]'
            }`}
          >
            {tab.replace('_', ' ')} ({counts[tab]})
          </button>
        ))}
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#111520] border border-[#1e2235] rounded-lg px-4 py-2 text-sm text-[#c9d1e8] placeholder-[#3a3f52] focus:outline-none focus:border-[#7aa2f7]"
        />
      </div>

      <div className="rounded-xl border border-[#1e2235] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1e2235] bg-[#0f1420]">
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#5a6278] uppercase tracking-wider">Attendee</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#5a6278] uppercase tracking-wider hidden sm:table-cell">Ticket</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#5a6278] uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#5a6278] uppercase tracking-wider hidden md:table-cell">RSVP</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-10 text-[#3a3f52]">No registrations match.</td>
              </tr>
            )}
            {filtered.map((r) => {
              const isCheckedIn = r.status === 'checked_in' || !!r.checked_in_at
              return (
                <tr key={r.id} className="border-b border-[#1e2235] hover:bg-[#111520] transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[#c9d1e8]">{r.members?.full_name ?? 'Unknown'}</div>
                    <div className="text-xs text-[#5a6278]">{r.members?.email}</div>
                  </td>
                  <td className="px-4 py-3 text-[#8892b0] hidden sm:table-cell">
                    {r.ticket_types?.name ?? '-'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-[#5a6278] hidden md:table-cell">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleCheckin(r.id, !isCheckedIn)}
                      disabled={isPending}
                      className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                        isCheckedIn
                          ? 'bg-[#1a2a10] text-[#9ece6a] border border-[#2a4020] hover:border-[#9ece6a]'
                          : 'bg-[#1a2035] text-[#5a6278] border border-[#1e2235] hover:text-[#c9d1e8] hover:border-[#7aa2f7]'
                      }`}
                    >
                      {isCheckedIn ? 'Checked in' : 'Check in'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-[#111520] border border-[#1e2235] rounded-xl px-4 py-3">
      <div className="text-xs text-[#5a6278] mb-1">{label}</div>
      <div className="text-2xl font-bold text-[#e2e8f0]">{value}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    confirmed: 'bg-[#1a2a10] text-[#9ece6a] border-[#2a4020]',
    checked_in: 'bg-[#0d2010] text-[#73daca] border-[#1a4030]',
    waitlisted: 'bg-[#1a1a0e] text-[#e0af68] border-[#3a3010]',
    cancelled: 'bg-[#1a0e0e] text-[#f7768e] border-[#3a1010]',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${styles[status] ?? 'bg-[#1a2035] text-[#5a6278] border-[#2a3558]'}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

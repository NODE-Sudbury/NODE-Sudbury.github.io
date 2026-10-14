'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Summary = {
  published_events: number
  total_events: number
  confirmed_registrations: number
  total_registrations: number
  member_count: number
  total_revenue_cents: number
}

type EventRow = {
  id: string
  title: string
  slug: string
  type: string
  status: string
  starts_at: string
  max_capacity: number
  confirmed_count: number
  waitlist_count: number
  checkin_count: number
  revenue_cents: number
}

type EventDetail = {
  event: { id: string; title: string; starts_at: string; ends_at: string; max_capacity: number; status: string }
  stats: {
    confirmed_count: number
    waitlist_count: number
    cancelled_count: number
    checkin_count: number
    no_show_count: number
    revenue_cents: number
    checkin_rate: number
  }
  registrations_by_day: { day: string; count: number }[]
  ticket_breakdown: { name: string; price_cents: number; count: number }[]
  status_breakdown: { status: string; count: number }[]
}

function fmt(cents: number) {
  return (cents / 100).toLocaleString('en-CA', { style: 'currency', currency: 'CAD' })
}

function StatusChip({ status }: { status: string }) {
  const colors: Record<string, string> = {
    published: 'bg-green-500/15 text-green-400',
    draft: 'bg-yellow-500/15 text-yellow-400',
    archived: 'bg-zinc-500/15 text-zinc-400',
    cancelled: 'bg-red-500/15 text-red-400',
    confirmed: 'bg-green-500/15 text-green-400',
    waitlisted: 'bg-yellow-500/15 text-yellow-400',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] ?? 'bg-zinc-500/15 text-zinc-400'}`}>
      {status}
    </span>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="border border-border rounded-lg p-5 bg-card">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

function BarChart({ data, label }: { data: { label: string; count: number }[]; label: string }) {
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">{label}</p>
      <div className="flex items-end gap-1.5" style={{ height: 100 }}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
            <div
              className="w-full rounded-t"
              style={{
                height: `${(d.count / max) * 100}%`,
                minHeight: d.count > 0 ? 4 : 0,
                background: '#38bdf8',
              }}
              title={`${d.label}: ${d.count}`}
            />
            <span className="text-[9px] text-muted-foreground truncate w-full text-center">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AnalyticsDashboard({
  summary,
  events,
}: {
  summary: Summary
  events: EventRow[]
}) {
  const [view, setView] = useState<'overview' | 'event'>('overview')
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [detail, setDetail] = useState<EventDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedEventId) return
    setLoading(true)
    fetch(`/api/admin/analytics/${selectedEventId}`)
      .then(r => r.json())
      .then(d => setDetail(d))
      .finally(() => setLoading(false))
  }, [selectedEventId])

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <select
          className="border border-border rounded-md px-3 py-1.5 text-sm bg-background"
          value={view}
          onChange={e => setView(e.target.value as 'overview' | 'event')}
        >
          <option value="overview">Platform overview</option>
          <option value="event">Per-event</option>
        </select>
      </div>

      {view === 'overview' && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Published Events"
              value={summary.published_events}
              sub={`${summary.total_events} total`}
            />
            <StatCard
              label="Confirmed RSVPs"
              value={summary.confirmed_registrations}
              sub={`${summary.total_registrations} total`}
            />
            <StatCard label="Members" value={summary.member_count} />
            <StatCard
              label="Total Revenue"
              value={fmt(summary.total_revenue_cents)}
              sub="confirmed registrations"
            />
          </div>

          {/* Events table */}
          <div>
            <h2 className="text-lg font-semibold mb-4">All Events</h2>
            <div className="border border-border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Event</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Registered</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Check-in</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Waitlist</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e, i) => {
                    const checkinRate = e.confirmed_count > 0
                      ? Math.round((e.checkin_count / e.confirmed_count) * 100)
                      : 0
                    return (
                      <tr key={e.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                        <td className="px-4 py-3">
                          <Link
                            href={`/events/${e.slug}`}
                            className="font-medium hover:text-blue-400 transition-colors"
                            target="_blank"
                          >
                            {e.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground">{e.type}</span>
                        </td>
                        <td className="px-4 py-3"><StatusChip status={e.status} /></td>
                        <td className="px-4 py-3 text-muted-foreground text-xs tabular-nums">
                          {e.starts_at ? new Date(e.starts_at).toLocaleDateString('en-CA') : '-'}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {e.confirmed_count}{e.max_capacity ? ` / ${e.max_capacity}` : ''}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {e.checkin_count > 0 ? `${checkinRate}%` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {e.waitlist_count > 0 ? e.waitlist_count : '-'}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {e.revenue_cents > 0 ? fmt(e.revenue_cents) : <span className="text-muted-foreground">-</span>}
                        </td>
                      </tr>
                    )
                  })}
                  {events.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No events yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {view === 'event' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Select event</label>
            <select
              className="border border-border rounded-md px-3 py-1.5 text-sm bg-background w-full max-w-sm"
              value={selectedEventId}
              onChange={e => { setSelectedEventId(e.target.value); setDetail(null) }}
            >
              <option value="">-- choose an event --</option>
              {events.map(e => (
                <option key={e.id} value={e.id}>
                  {e.title} ({e.starts_at ? new Date(e.starts_at).toLocaleDateString('en-CA') : 'no date'})
                </option>
              ))}
            </select>
          </div>

          {loading && <p className="text-muted-foreground text-sm">Loading...</p>}

          {detail && !loading && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">{detail.event.title}</h2>

              {/* Top stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <StatCard
                  label="Registered"
                  value={detail.stats.confirmed_count}
                  sub={detail.event.max_capacity ? `of ${detail.event.max_capacity}` : 'no cap'}
                />
                <StatCard
                  label="Checked In"
                  value={detail.stats.checkin_count}
                  sub={`${detail.stats.checkin_rate}% rate`}
                />
                <StatCard
                  label="No-Shows"
                  value={detail.stats.no_show_count}
                  sub="after event ended"
                />
                <StatCard
                  label="Waitlist"
                  value={detail.stats.waitlist_count}
                />
                <StatCard
                  label="Revenue"
                  value={fmt(detail.stats.revenue_cents)}
                />
              </div>

              {/* Registrations over time */}
              {detail.registrations_by_day.length > 0 && (
                <div className="border border-border rounded-lg p-5">
                  <BarChart
                    label="Registrations over time"
                    data={detail.registrations_by_day.map(d => ({
                      label: d.day.slice(5),
                      count: d.count,
                    }))}
                  />
                </div>
              )}

              {/* Ticket breakdown */}
              {detail.ticket_breakdown.length > 0 && (
                <div className="border border-border rounded-lg p-5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Ticket type breakdown</p>
                  <div className="space-y-3">
                    {detail.ticket_breakdown.map(t => {
                      const max = Math.max(...detail.ticket_breakdown.map(x => x.count), 1)
                      return (
                        <div key={t.name} className="flex items-center gap-3">
                          <span className="text-sm w-36 truncate shrink-0">{t.name}</span>
                          <div className="flex-1 bg-muted/30 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-sky-400"
                              style={{ width: `${(t.count / max) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm tabular-nums w-8 text-right">{t.count}</span>
                          {t.price_cents > 0 && (
                            <span className="text-xs text-muted-foreground w-20 text-right">{fmt(t.price_cents * t.count)}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Status breakdown */}
              <div className="border border-border rounded-lg p-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Registration status</p>
                <div className="flex gap-6">
                  {detail.status_breakdown.map(s => (
                    <div key={s.status} className="flex items-center gap-2">
                      <StatusChip status={s.status} />
                      <span className="text-sm tabular-nums font-medium">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

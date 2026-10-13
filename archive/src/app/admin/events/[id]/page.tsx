import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminEventOverviewPage({ params }: { params: { id: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: event } = await db
    .from('events')
    .select('id, title, slug, type, status, starts_at, ends_at, max_capacity, venue_name')
    .eq('id', params.id)
    .single()

  if (!event) notFound()

  const [
    { count: confirmed },
    { count: waitlisted },
    { count: checkedIn },
    { count: cancelled },
    { count: interests },
  ] = await Promise.all([
    db.from('registrations').select('*', { count: 'exact', head: true }).eq('event_id', params.id).eq('status', 'confirmed'),
    db.from('registrations').select('*', { count: 'exact', head: true }).eq('event_id', params.id).eq('status', 'waitlisted'),
    db.from('registrations').select('*', { count: 'exact', head: true }).eq('event_id', params.id).not('checked_in_at', 'is', null),
    db.from('registrations').select('*', { count: 'exact', head: true }).eq('event_id', params.id).eq('status', 'cancelled'),
    db.from('event_interests').select('*', { count: 'exact', head: true }).eq('event_id', params.id),
  ])

  const cap = event.max_capacity ?? 0
  const confirmedN = confirmed ?? 0
  const pct = cap > 0 ? Math.round((confirmedN / cap) * 100) : 0

  const stats = [
    { label: 'Confirmed', value: confirmedN, color: '#9ece6a', href: 'registrations' },
    { label: 'Waitlisted', value: waitlisted ?? 0, color: '#e0af68', href: 'registrations' },
    { label: 'Checked in', value: checkedIn ?? 0, color: '#38bdf8', href: 'registrations' },
    { label: 'Cancelled', value: cancelled ?? 0, color: '#f7768e', href: 'registrations' },
    { label: 'Interested', value: interests ?? 0, color: '#bb9af7', href: null },
  ]

  const quickLinks = [
    { label: 'Edit event details', href: 'edit', icon: '✏️' },
    { label: 'Manage registrations', href: 'registrations', icon: '👥' },
    { label: 'Check-in scanner', href: `/admin/checkin/${params.id}`, icon: '📷', external: true },
    { label: 'Export attendees', href: `/api/admin/events/${params.id}/logistics/export?format=csv`, icon: '⬇️', external: true },
    { label: 'View public page', href: `/events/${event.slug}`, icon: '🌐', external: true },
  ]

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-[#131927] border border-[#252b3a] rounded-lg px-4 py-3">
            <p className="text-xs text-[#8892a4] mb-1">{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Capacity bar */}
      {cap > 0 && (
        <div className="bg-[#131927] border border-[#252b3a] rounded-lg px-5 py-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-[#c9d1e8] font-medium">Capacity</span>
            <span className="text-[#8892a4]">{confirmedN} / {cap} ({pct}%)</span>
          </div>
          <div className="h-2 bg-[#1a2035] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: pct >= 90 ? '#f7768e' : pct >= 70 ? '#e0af68' : '#9ece6a' }}
            />
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="bg-[#131927] border border-[#252b3a] rounded-lg divide-y divide-[#1a2035]">
        <p className="px-5 py-3 text-xs font-semibold text-[#8892a4] uppercase tracking-wider">Quick actions</p>
        {quickLinks.map(link => (
          <Link
            key={link.label}
            href={link.external ? link.href : `/admin/events/${params.id}/${link.href}`}
            target={link.external ? '_blank' : undefined}
            className="flex items-center gap-3 px-5 py-3 text-sm text-[#c9d1e8] hover:bg-[#1a2035] transition-colors"
          >
            <span className="text-base">{link.icon}</span>
            <span>{link.label}</span>
            {link.external && <span className="ml-auto text-[#3a4460] text-xs">↗</span>}
          </Link>
        ))}
      </div>

      {/* Event info */}
      <div className="bg-[#131927] border border-[#252b3a] rounded-lg px-5 py-4">
        <p className="text-xs font-semibold text-[#8892a4] uppercase tracking-wider mb-3">Event info</p>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <span className="text-[#8892a4]">Status</span>
          <span className="text-[#c9d1e8] capitalize">{event.status}</span>
          <span className="text-[#8892a4]">Type</span>
          <span className="text-[#c9d1e8] capitalize">{event.type?.replace(/_/g, ' ')}</span>
          <span className="text-[#8892a4]">Starts</span>
          <span className="text-[#c9d1e8]">{new Date(event.starts_at).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })}</span>
          {event.venue_name && (
            <>
              <span className="text-[#8892a4]">Venue</span>
              <span className="text-[#c9d1e8]">{event.venue_name}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

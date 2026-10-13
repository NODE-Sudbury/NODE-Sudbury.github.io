import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminEventAnalyticsPage({ params }: { params: { id: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: member } = await supabase.from('members').select('role').eq('id', session.user.id).single()
  if (!member || !['board', 'admin', 'super_admin'].includes(member.role ?? '')) redirect('/dashboard')

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: event } = await db
    .from('events')
    .select('id, title, slug, starts_at, ends_at, max_capacity')
    .eq('id', params.id)
    .single()

  if (!event) notFound()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const data = await fetch(
    `${appUrl}/api/admin/analytics/${params.id}`,
    { cache: 'no-store', headers: { cookie: cookieStore.toString() } }
  ).then((r) => r.json()).catch(() => null)

  const stats = data ?? {
    confirmed: 0,
    waitlisted: 0,
    checked_in: 0,
    cancelled: 0,
    total: 0,
    avg_nps: null,
    avg_rating: null,
    feedback_count: 0,
    registrations_by_day: [],
  }

  const maxDay = Math.max(...(stats.registrations_by_day ?? []).map((d: { count: number }) => d.count), 1)

  return (
    <div className="min-h-screen bg-[#0b0e14] py-10 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8 text-xs">
          <Link href="/admin/events" className="text-[#5a6278] hover:text-[#c9d1e8]">Admin</Link>
          <span className="text-[#3a3f52]">/</span>
          <Link href="/admin/events" className="text-[#5a6278] hover:text-[#c9d1e8]">{event.title}</Link>
          <span className="text-[#3a3f52]">/</span>
          <span className="text-[#c9d1e8]">Analytics</span>
        </div>

        <h1 className="text-2xl font-bold text-[#e2e8f0] mb-6">{event.title} - Analytics</h1>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <Stat label="Confirmed" value={stats.confirmed} color="text-[#9ece6a]" />
          <Stat label="Checked in" value={stats.checked_in} color="text-[#73daca]" />
          <Stat label="Waitlisted" value={stats.waitlisted} color="text-[#e0af68]" />
          <Stat
            label="Check-in rate"
            value={stats.confirmed + stats.checked_in > 0
              ? `${Math.round((stats.checked_in / (stats.confirmed + stats.checked_in)) * 100)}%`
              : '0%'}
            color="text-[#7aa2f7]"
          />
        </div>

        {stats.registrations_by_day && stats.registrations_by_day.length > 0 && (
          <div className="mb-8 bg-[#111520] border border-[#1e2235] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-[#c9d1e8] mb-4">Registrations over time</h2>
            <div className="flex items-end gap-1 h-32">
              {stats.registrations_by_day.map((d: { date: string; count: number }) => (
                <div key={d.date} className="flex flex-col items-center gap-1 flex-1 min-w-0" title={`${d.date}: ${d.count}`}>
                  <div
                    className="w-full rounded-t bg-[#7aa2f7] min-h-[2px]"
                    style={{ height: `${Math.max(2, (d.count / maxDay) * 112)}px` }}
                  />
                  <div className="text-[9px] text-[#3a3f52] truncate w-full text-center">
                    {d.date.slice(5)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats.feedback_count > 0 && (
          <div className="bg-[#111520] border border-[#1e2235] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-[#c9d1e8] mb-4">Feedback summary ({stats.feedback_count} responses)</h2>
            <div className="grid grid-cols-2 gap-4">
              {stats.avg_nps !== null && (
                <div>
                  <div className="text-xs text-[#5a6278] mb-1">Avg NPS score</div>
                  <div className="text-3xl font-bold text-[#9ece6a]">{stats.avg_nps?.toFixed(1)}</div>
                  <div className="text-xs text-[#3a3f52]">out of 10</div>
                </div>
              )}
              {stats.avg_rating !== null && (
                <div>
                  <div className="text-xs text-[#5a6278] mb-1">Avg overall rating</div>
                  <div className="text-3xl font-bold text-[#e0af68]">{stats.avg_rating?.toFixed(1)}</div>
                  <div className="text-xs text-[#3a3f52]">out of 5</div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <Link
            href={`/admin/events/${params.id}/registrations`}
            className="text-xs px-4 py-2 rounded-lg bg-[#1a2035] text-[#7aa2f7] border border-[#2a3558] hover:border-[#7aa2f7] transition-colors"
          >
            View Registrations
          </Link>
          <Link
            href={`/admin/events/${params.id}/feedback`}
            className="text-xs px-4 py-2 rounded-lg bg-[#1a2035] text-[#7aa2f7] border border-[#2a3558] hover:border-[#7aa2f7] transition-colors"
          >
            View Feedback
          </Link>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-[#111520] border border-[#1e2235] rounded-xl px-4 py-3">
      <div className="text-xs text-[#5a6278] mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  )
}

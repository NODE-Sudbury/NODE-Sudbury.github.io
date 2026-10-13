import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type RegRow = {
  id: string
  status: string
  checked_in_at: string | null
  events: { id: string; title: string; slug: string; starts_at: string; type: string } | null
  ticket_types: { name: string } | null
}

export default async function MyEventsPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: rawRegs } = await supabase
    .from('registrations')
    .select(`
      id, status, checked_in_at,
      events ( id, title, slug, starts_at, ends_at, type, status ),
      ticket_types ( name )
    `)
    .eq('member_id', session.user.id)
    .order('created_at', { ascending: false })

  const rows = (rawRegs ?? []) as unknown as RegRow[]
  const now = new Date()
  const upcoming = rows.filter(
    (r) => r.events && new Date(r.events.starts_at) >= now
  )
  const past = rows.filter(
    (r) => r.events && new Date(r.events.starts_at) < now
  )

  return (
    <div className="min-h-screen bg-[#0b0e14] py-10 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8 text-xs">
          <Link href="/dashboard" className="text-[#5a6278] hover:text-[#c9d1e8]">Dashboard</Link>
          <span className="text-[#3a3f52]">/</span>
          <span className="text-[#c9d1e8]">My Events</span>
        </div>

        <h1 className="text-2xl font-bold text-[#e2e8f0] mb-6">My Events</h1>

        <Section title="Upcoming" items={upcoming} />
        <Section title="Past" items={past} />
      </div>
    </div>
  )
}

function Section({ title, items }: { title: string; items: RegRow[] }) {
  if (items.length === 0) return null
  return (
    <div className="mb-8">
      <h2 className="text-xs font-semibold text-[#5a6278] uppercase tracking-wider mb-3">{title}</h2>
      <div className="space-y-2">
        {items.map((r) => {
          const ev = r.events
          if (!ev) return null
          const date = new Date(ev.starts_at)
          const isCheckedIn = r.status === 'checked_in' || !!r.checked_in_at
          return (
            <Link
              key={r.id}
              href={`/events/${ev.slug}`}
              className="flex items-center gap-4 px-4 py-3 rounded-xl border border-[#1e2235] bg-[#111520] hover:border-[#7aa2f7] transition-colors group"
            >
              <div className="flex-shrink-0 w-12 text-center">
                <div className="text-xs text-[#5a6278]">{date.toLocaleString('default', { month: 'short' })}</div>
                <div className="text-lg font-bold text-[#c9d1e8]">{date.getDate()}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[#c9d1e8] group-hover:text-[#7aa2f7] truncate">{ev.title}</div>
                <div className="text-xs text-[#5a6278] mt-0.5">{r.ticket_types?.name ?? ev.type}</div>
              </div>
              <div className="flex-shrink-0">
                {isCheckedIn ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#1a2a10] text-[#9ece6a] border border-[#2a4020]">Attended</span>
                ) : r.status === 'waitlisted' ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#1a1a0e] text-[#e0af68] border border-[#3a3010]">Waitlisted</span>
                ) : r.status === 'cancelled' ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#1a0e0e] text-[#f7768e] border border-[#3a1010]">Cancelled</span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#1a2035] text-[#7aa2f7] border border-[#2a3558]">Registered</span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

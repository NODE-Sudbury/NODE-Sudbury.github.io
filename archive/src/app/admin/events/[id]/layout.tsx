import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import AdminEventTabNav from './AdminEventTabNav'

export const dynamic = 'force-dynamic'

function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    workshop:   'bg-[#0d2a3a] text-[#38bdf8] border-[#1a3a4a]',
    hackathon:  'bg-[#1a2a0e] text-[#9ece6a] border-[#2a4020]',
    meetup:     'bg-[#1a1a2a] text-[#bb9af7] border-[#2a2a4a]',
    conference: 'bg-[#2a1a0e] text-[#e0af68] border-[#3a2a10]',
  }
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize ${styles[type] ?? 'bg-[#1a2035] text-[#8892a4] border-[#252b3a]'}`}>
      {type.replace(/_/g, ' ')}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    published: 'bg-[#1a2a10] text-[#9ece6a] border-[#2a4020]',
    draft:     'bg-[#1a1a1a] text-[#8892a4] border-[#252b3a]',
    cancelled: 'bg-[#1a0e0e] text-[#f7768e] border-[#3a1010]',
    archived:  'bg-[#0e0e1a] text-[#7aa2f7] border-[#1a2035]',
  }
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize ${styles[status] ?? 'bg-[#1a2035] text-[#8892a4] border-[#252b3a]'}`}>
      {status}
    </span>
  )
}

export default async function AdminEventLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { id: string }
}) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: member } = await supabase
    .from('members')
    .select('role')
    .eq('id', session.user.id)
    .single()
  if (!member || !['board', 'admin', 'super_admin'].includes(member.role)) redirect('/dashboard')

  // Use service role client so draft events are not blocked by RLS
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: event } = await db
    .from('events')
    .select('id, title, slug, type, status, starts_at, stream_url')
    .eq('id', params.id)
    .single()

  if (!event) notFound()

  const starts = new Date(event.starts_at).toLocaleString('en-CA', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="min-h-screen bg-[#0d1117]">
      {/* Event header */}
      <div className="bg-[#0d1117] border-b border-[#252b3a] px-6 py-3">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-xs text-[#8892a4] mb-1.5">
            <Link href="/admin/events" className="hover:text-[#c9d1e8] transition-colors">Events</Link>
            <span>/</span>
            <span className="text-[#c9d1e8] truncate max-w-xs">{event.title}</span>
          </div>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-base font-semibold text-[#e2e8f0]">{event.title}</h1>
              <TypeBadge type={event.type} />
              <StatusBadge status={event.status} />
              <span className="text-xs text-[#3a4460] hidden sm:inline">{starts}</span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/events/${event.slug}`}
                target="_blank"
                className="px-3 py-1.5 rounded text-xs text-[#8892a4] border border-[#252b3a] hover:text-[#c9d1e8] hover:border-[#38bdf8]/30 transition-colors"
              >
                View page
              </Link>
              <Link
                href={`/admin/events/${params.id}/edit`}
                className="px-3 py-1.5 rounded text-xs bg-[#38bdf8] text-black font-semibold hover:bg-[#7dd3fc] transition-colors"
              >
                Edit details
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Tab nav - client component reads pathname for active state */}
      <AdminEventTabNav
        eventId={params.id}
        eventType={event.type}
        hasStream={!!event.stream_url}
      />

      {/* Page content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {children}
      </div>
    </div>
  )
}

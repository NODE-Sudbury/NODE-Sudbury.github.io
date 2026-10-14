import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import RegistrationsAdmin from './RegistrationsAdmin'

export const dynamic = 'force-dynamic'

export default async function AdminRegistrationsPage({ params }: { params: { id: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: member } = await supabase.from('members').select('role').eq('id', session.user.id).single()
  if (!member || !['board', 'admin', 'super_admin'].includes(member.role)) redirect('/dashboard')

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: event } = await db
    .from('events')
    .select('id, title, slug, max_capacity')
    .eq('id', params.id)
    .single()

  if (!event) notFound()

  const { data: registrations } = await db
    .from('registrations')
    .select(`
      id, status, checked_in_at, created_at, attendance_mode, waitlist_position,
      members ( id, full_name, email, avatar_url ),
      ticket_types ( id, name )
    `)
    .eq('event_id', params.id)
    .order('created_at', { ascending: true })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-[#e2e8f0]">Registrations</h2>
        <a
          href={`/api/admin/events/${params.id}/attendance/export`}
          className="text-xs px-4 py-2 rounded-lg bg-[#1a2035] text-[#7aa2f7] border border-[#2a3558] hover:border-[#7aa2f7] transition-colors"
        >
          Export CSV
        </a>
      </div>
      <RegistrationsAdmin
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        registrations={(registrations ?? []) as any}
        eventId={params.id}
        maxCapacity={event.max_capacity}
      />
    </div>
  )
}

import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import FeedbackAdmin from './FeedbackAdmin'

export const dynamic = 'force-dynamic'

export default async function AdminFeedbackPage({ params }: { params: { id: string } }) {
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
    .select('id, title, slug')
    .eq('id', params.id)
    .single()

  if (!event) notFound()

  return (
    <div className="min-h-screen bg-[#0b0e14] py-10 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/admin/events" className="text-xs text-[#5a6278] hover:text-[#c9d1e8]">Admin</Link>
          <span className="text-[#3a3f52]">/</span>
          <span className="text-xs text-[#5a6278]">Feedback</span>
        </div>
        <div className="flex items-center justify-between mb-6">
          <div />
          <a
            href={`/api/admin/events/${event.id}/attendance/export`}
            className="text-xs text-[#5a6278] hover:text-[#c9d1e8] border border-[#252b3a] px-3 py-1.5 rounded"
          >
            Export Attendance CSV
          </a>
        </div>
        <FeedbackAdmin eventId={event.id} eventTitle={event.title} />
      </div>
    </div>
  )
}

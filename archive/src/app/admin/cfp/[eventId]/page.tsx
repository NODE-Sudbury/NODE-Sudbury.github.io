import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import CFPReview from './CFPReview'

export const dynamic = 'force-dynamic'

export default async function AdminCFPPage({ params }: { params: { eventId: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: member } = await supabase
    .from('members').select('role').eq('id', session.user.id).single()
  if (!member || !['board', 'admin'].includes(member.role)) redirect('/')

  const { data: event } = await supabase
    .from('events').select('id, title').eq('id', params.eventId).single()
  if (!event) redirect('/admin')

  const { data: submissions } = await supabase
    .from('cfp_submissions')
    .select('*, members(full_name, email)')
    .eq('event_id', params.eventId)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-[#0b0e14] py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <p className="text-[#5a6278] text-sm mb-1">Admin</p>
          <h1 className="text-2xl font-semibold text-white">CFP Review - {event.title}</h1>
          <p className="text-[#5a6278] text-sm mt-1">{submissions?.length ?? 0} submission{submissions?.length !== 1 ? 's' : ''}</p>
        </div>
        <CFPReview eventId={params.eventId} initialSubmissions={submissions ?? []} />
      </div>
    </div>
  )
}

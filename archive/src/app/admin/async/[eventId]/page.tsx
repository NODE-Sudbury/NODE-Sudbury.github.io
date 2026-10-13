import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { AsyncAdmin } from './AsyncAdmin'

export const dynamic = 'force-dynamic'

export default async function AsyncAdminPage({ params }: { params: { eventId: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: member } = await supabase.from('members').select('role').eq('id', session.user.id).single()
  if (!member || member.role !== 'board') notFound()

  const [challengesRes, submissionsRes] = await Promise.all([
    supabase.from('async_challenges').select('*').eq('event_id', params.eventId).order('created_at'),
    supabase.from('async_submissions')
      .select('id, title, status, score, reviewer_notes, submitted_at, members(display_name), async_challenges(title)')
      .eq('event_id', params.eventId)
      .order('submitted_at', { ascending: false }),
  ])

  return (
    <div className="min-h-screen bg-gray-950 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-8">Async Event Admin</h1>
        <AsyncAdmin
          eventId={params.eventId}
          initialChallenges={challengesRes.data ?? []}
          initialSubmissions={(submissionsRes.data ?? []) as unknown as Parameters<typeof AsyncAdmin>[0]['initialSubmissions']}
        />
      </div>
    </div>
  )
}

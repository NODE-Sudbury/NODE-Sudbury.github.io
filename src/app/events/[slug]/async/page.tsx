import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { AsyncEventClient } from './AsyncEventClient'

export const dynamic = 'force-dynamic'

export default async function AsyncEventPage({ params }: { params: { slug: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: event } = await supabase
    .from('events').select('id, title, type').eq('slug', params.slug).single()
  if (!event) notFound()

  const { data: { session } } = await supabase.auth.getSession()
  let member: { id: string } | null = null
  let mySubmissions: unknown[] = []
  let isRegistered = false

  if (session) {
    const { data: m } = await supabase.from('members').select('id').eq('user_id', session.user.id).single()
    member = m ?? null
    if (member) {
      const [subRes, regRes] = await Promise.all([
        supabase.from('async_submissions').select('*').eq('event_id', event.id).eq('member_id', member.id),
        supabase.from('registrations').select('id').eq('event_id', event.id).eq('member_id', member.id).eq('status', 'confirmed').maybeSingle(),
      ])
      mySubmissions = subRes.data ?? []
      isRegistered = !!regRes.data
    }
  }

  const { data: challenges } = await supabase
    .from('async_challenges').select('*').eq('event_id', event.id).order('created_at')

  const now = new Date().toISOString()
  const readyChallengeIds = (challenges ?? [])
    .filter(c => c.results_at && c.results_at <= now).map((c: { id: string }) => c.id)

  const gallery = readyChallengeIds.length > 0
    ? (await supabase.from('async_submissions')
        .select('id, title, description, submission_url, submission_text, status, score, submitted_at, members(display_name, avatar_url), async_challenges(title)')
        .in('challenge_id', readyChallengeIds)
        .in('status', ['submitted', 'reviewed', 'winner', 'honourable_mention'])).data ?? []
    : []

  return (
    <div className="min-h-screen bg-gray-950 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">{event.title}</h1>
          <p className="text-gray-400 mt-1">Async Challenges</p>
        </div>
        {!session && (
          <div className="mb-6 p-4 bg-sky-900/20 border border-sky-800 rounded-lg text-sky-300 text-sm">
            <a href="/login" className="underline font-semibold">Sign in</a> to submit your work.
          </div>
        )}
        {challenges?.length === 0 ? (
          <p className="text-gray-500">No challenges have been posted yet.</p>
        ) : (
          <AsyncEventClient
            challenges={challenges ?? []}
            mySubmissions={mySubmissions as Parameters<typeof AsyncEventClient>[0]['mySubmissions']}
            gallery={gallery as unknown as Parameters<typeof AsyncEventClient>[0]['gallery']}
            isRegistered={isRegistered}
          />
        )}
      </div>
    </div>
  )
}

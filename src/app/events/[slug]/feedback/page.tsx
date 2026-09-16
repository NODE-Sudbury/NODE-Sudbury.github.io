import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import FeedbackForm from './FeedbackForm'

export const dynamic = 'force-dynamic'

export default async function FeedbackPage({ params }: { params: { slug: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect(`/login?next=/events/${params.slug}/feedback`)

  const { data: event } = await supabase
    .from('events')
    .select('id, title, slug, status, starts_at')
    .eq('slug', params.slug)
    .is('deleted_at', null)
    .single()

  if (!event) notFound()

  const isArchived = event.status === 'archived'

  if (!isArchived) {
    return (
      <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <p className="text-2xl font-bold text-white">{event.title}</p>
          <p className="text-[#5a6278]">Feedback opens after the event ends.</p>
          <Link href={`/events/${params.slug}`} className="text-sm text-[#7aa2f7] hover:underline">Back to event</Link>
        </div>
      </div>
    )
  }

  const { data: existing } = await supabase
    .from('event_feedback')
    .select('nps_score, overall_rating, what_went_well, what_could_improve, would_attend_again, submitted_at')
    .eq('event_id', event.id)
    .eq('member_id', session.user.id)
    .maybeSingle()

  if (existing) {
    return (
      <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-4">
          <div className="text-center space-y-2">
            <div className="text-4xl">Thanks!</div>
            <p className="text-xl font-bold text-white">Feedback submitted</p>
            <p className="text-sm text-[#5a6278]">
              {new Date(existing.submitted_at).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="bg-[#13161f] border border-[#252b3a] rounded-lg p-4 space-y-2 text-sm">
            {existing.nps_score !== null && (
              <div className="flex justify-between">
                <span className="text-[#5a6278]">NPS score</span>
                <span className="text-white font-semibold">{existing.nps_score}/10</span>
              </div>
            )}
            {existing.overall_rating !== null && (
              <div className="flex justify-between">
                <span className="text-[#5a6278]">Overall rating</span>
                <span className="text-white font-semibold">{'★'.repeat(existing.overall_rating)}{'☆'.repeat(5 - existing.overall_rating)}</span>
              </div>
            )}
            {existing.would_attend_again !== null && (
              <div className="flex justify-between">
                <span className="text-[#5a6278]">Would attend again</span>
                <span className="text-white font-semibold">{existing.would_attend_again ? 'Yes' : 'No'}</span>
              </div>
            )}
          </div>
          <div className="text-center">
            <Link href={`/events/${params.slug}`} className="text-sm text-[#7aa2f7] hover:underline">Back to event</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0b0e14] py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="mb-8">
          <Link href={`/events/${params.slug}`} className="text-xs text-[#5a6278] hover:text-[#c9d1e8]">
            Back to event
          </Link>
          <h1 className="text-2xl font-bold text-white mt-4">{event.title}</h1>
          <p className="text-[#5a6278] text-sm mt-1">Share your feedback to help us improve future events.</p>
        </div>
        <FeedbackForm eventId={event.id} eventSlug={params.slug} />
      </div>
    </div>
  )
}

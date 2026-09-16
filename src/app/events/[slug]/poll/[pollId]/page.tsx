import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import PollClient from './PollClient'

export const dynamic = 'force-dynamic'

export default async function PollPage({
  params,
}: {
  params: { slug: string; pollId: string }
}) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: event } = await supabase
    .from('events')
    .select('id, title, slug')
    .eq('slug', params.slug)
    .single()
  if (!event) notFound()

  const { data: poll } = await supabase
    .from('live_polls')
    .select('id, question, status, allows_multiple')
    .eq('id', params.pollId)
    .eq('event_id', event.id)
    .single()
  if (!poll) notFound()

  const { data: options } = await supabase
    .from('poll_options')
    .select('id, option_text, vote_count, sort_order')
    .eq('poll_id', params.pollId)
    .order('sort_order', { ascending: true })

  const { data: { session } } = await supabase.auth.getSession()

  return (
    <PollClient
      poll={poll}
      initialOptions={options ?? []}
      userId={session?.user.id ?? null}
      eventTitle={event.title}
    />
  )
}

import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import QAClient from './QAClient'

export const dynamic = 'force-dynamic'

export default async function QAPage({ params }: { params: { slug: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: event } = await supabase
    .from('events')
    .select('id, title, slug, status')
    .eq('slug', params.slug)
    .single()

  if (!event) notFound()

  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user.id ?? null

  let isBoard = false
  if (userId) {
    const { data: member } = await supabase
      .from('members').select('role').eq('id', userId).single()
    isBoard = ['board', 'admin', 'super_admin'].includes(member?.role ?? '')
  }

  // Non-board users cannot access Q&A for draft events
  if (!isBoard && !['published', 'archived'].includes(event.status)) redirect(`/events/${params.slug}`)

  const { data: questions } = await supabase
    .from('qa_questions')
    .select('*, members(full_name)')
    .eq('event_id', event.id)
    .order('upvotes', { ascending: false })

  return (
    <QAClient
      eventId={event.id}
      eventTitle={event.title}
      isBoard={isBoard}
      userId={userId}
      initialQuestions={questions ?? []}
    />
  )
}

import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import QuizAdmin from './QuizAdmin'

export const dynamic = 'force-dynamic'

export default async function EventQuizAdminPage({ params }: { params: { eventId: string } }) {
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
  if (!member || !['board', 'admin'].includes(member.role)) redirect('/dashboard')

  const { data: event } = await supabase
    .from('events').select('id, title, slug').eq('id', params.eventId).single()
  if (!event) notFound()

  const [{ data: rooms }, { data: templates }] = await Promise.all([
    supabase
      .from('quiz_rooms')
      .select('id, pin, status, started_at, ended_at, quiz_templates(name), quiz_participants(count)')
      .eq('event_id', params.eventId)
      .order('created_at', { ascending: false }),
    supabase
      .from('quiz_templates')
      .select('id, name, description, quiz_questions(count)')
      .order('name'),
  ])

  return (
    <QuizAdmin
      event={event}
      initialRooms={(rooms ?? []) as any}
      templates={(templates ?? []) as any}
    />
  )
}

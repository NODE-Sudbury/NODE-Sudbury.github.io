import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import QuizCreate from './QuizCreate'

export const dynamic = 'force-dynamic'

export default async function QuizNewPage() {
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
    .select('id, role')
    .eq('user_id', session.user.id)
    .single()
  if (!member || member.role !== 'board') redirect('/dashboard')

  const { data: templates } = await supabase
    .from('quiz_templates')
    .select('id, name, description')
    .order('created_at', { ascending: false })

  const { data: events } = await supabase
    .from('events')
    .select('id, title')
    .in('status', ['published', 'draft'])
    .order('starts_at', { ascending: false })

  return <QuizCreate templates={templates ?? []} events={events ?? []} />
}

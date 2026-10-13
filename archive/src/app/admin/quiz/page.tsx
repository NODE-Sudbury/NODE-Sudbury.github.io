import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import QuizTemplateAdmin from './QuizTemplateAdmin'

export const dynamic = 'force-dynamic'

export default async function AdminQuizPage() {
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
    .eq('id', session.user.id)
    .single()
  if (!member || member.role !== 'board') redirect('/dashboard')

  const { data: templates } = await supabase
    .from('quiz_templates')
    .select('id, name, description, created_at, quiz_questions(id, question_text, sort_order)')
    .order('created_at', { ascending: false })

  return <QuizTemplateAdmin templates={templates ?? []} />
}

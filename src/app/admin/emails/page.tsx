export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { EmailsClient } from './EmailsClient'

export default async function AdminEmailsPage() {
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
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!member || !['board', 'admin'].includes(member.role)) redirect('/dashboard')

  const { data: events } = await supabase
    .from('events')
    .select('id, title, starts_at, type, status')
    .in('status', ['published', 'archived', 'draft'])
    .order('starts_at', { ascending: false })
    .limit(30)

  return <EmailsClient events={events ?? []} />
}

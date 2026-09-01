import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { WhiteboardClient } from './WhiteboardClient'

export const dynamic = 'force-dynamic'

export default async function WhiteboardPage({ params }: { params: { sessionId: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect(`/login?next=/whiteboard/${params.sessionId}`)

  const { data: wb } = await supabase
    .from('whiteboard_sessions')
    .select('id, title, is_active, event_id, created_by')
    .eq('id', params.sessionId)
    .single()

  if (!wb) notFound()

  const { data: member } = await supabase
    .from('members')
    .select('id, full_name, avatar_url')
    .eq('id', session.user.id)
    .single()

  return (
    <WhiteboardClient
      session={wb}
      currentUser={{ id: member?.id ?? session.user.id, name: member?.full_name ?? 'Anonymous' }}
    />
  )
}

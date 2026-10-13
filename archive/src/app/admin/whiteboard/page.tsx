import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { WhiteboardAdmin } from './WhiteboardAdmin'

export const dynamic = 'force-dynamic'

export default async function AdminWhiteboardPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: member } = await supabase
    .from('members').select('role').eq('id', session.user.id).single()
  if (!member || !['board', 'admin', 'super_admin'].includes(member.role)) redirect('/dashboard')

  const { data: sessions } = await supabase
    .from('whiteboard_sessions')
    .select('id, title, is_active, event_id, created_at, event:events(title)')
    .order('created_at', { ascending: false })

  const { data: events } = await supabase
    .from('events')
    .select('id, title')
    .in('status', ['published', 'draft'])
    .order('starts_at', { ascending: false })
    .limit(50)

  return (
    <>
      <WhiteboardAdmin
        sessions={(sessions ?? []) as any}
        events={(events ?? []) as any}
      />
    </>
  )
}

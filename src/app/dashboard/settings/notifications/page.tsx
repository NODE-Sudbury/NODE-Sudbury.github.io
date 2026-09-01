import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import NotifPrefsClient from './NotifPrefsClient'

export const dynamic = 'force-dynamic'

export default async function NotifPrefsPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: member } = await supabase
    .from('members')
    .select('id')
    .eq('user_id', session.user.id)
    .single()

  if (!member) redirect('/login')

  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('channel, type, enabled')
    .eq('member_id', member.id)

  return <NotifPrefsClient prefs={prefs ?? []} memberId={member.id} />
}

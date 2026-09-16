import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import PushAdmin from './PushAdmin'

export const dynamic = 'force-dynamic'

export default async function PushAdminPage() {
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
    .select('id, role')
    .eq('user_id', session.user.id)
    .single()

  if (!member || !['board', 'admin'].includes(member.role)) redirect('/dashboard')

  const { count } = await supabase
    .from('push_subscriptions')
    .select('id', { count: 'exact', head: true })

  return <PushAdmin subscriberCount={count ?? 0} />
}

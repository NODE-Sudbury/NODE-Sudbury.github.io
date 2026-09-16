import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ApiKeysClient } from './ApiKeysClient'

export const dynamic = 'force-dynamic'

export default async function AdminApiKeysPage() {
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

  if (!member || !['board', 'admin', 'super_admin'].includes(member.role)) {
    redirect('/dashboard')
  }

  const { data: apiKeys } = await supabase
    .from('api_keys')
    .select('id, label, prefix, created_at, last_used_at, revoked_at')
    .eq('created_by', session.user.id)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })

  return <ApiKeysClient keys={apiKeys ?? []} />
}

import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { FlagsClient } from './FlagsClient'

export const dynamic = 'force-dynamic'

export default async function AdminFlagsPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: member } = await supabase.from('members').select('role').eq('id', session.user.id).single()
  if (!member || !['board', 'admin', 'super_admin'].includes(member.role)) redirect('/dashboard')

  const { data: flags } = await supabase
    .from('feature_flags')
    .select('key, description, enabled, updated_at')
    .order('key', { ascending: true })

  return <FlagsClient flags={flags ?? []} />
}

import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AdminModerationClient } from './AdminModerationClient'

export const dynamic = 'force-dynamic'

export default async function AdminModerationPage() {
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

  const [{ data: flags }, { data: bans }] = await Promise.all([
    supabase
      .from('content_flags')
      .select(`
        id, reason, status, content_type, content_id, created_at,
        reporter:members!content_flags_reporter_id_fkey(id, full_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('member_bans')
      .select(`
        id, reason, banned_until, is_permanent, created_at,
        member:members!member_bans_member_id_fkey(id, full_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  return (
    <>
      <AdminModerationClient flags={(flags ?? []) as any} bans={(bans ?? []) as any} />
    </>
  )
}

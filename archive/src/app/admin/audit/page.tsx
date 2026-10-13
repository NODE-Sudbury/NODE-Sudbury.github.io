import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AdminAuditClient } from './AdminAuditClient'

export const dynamic = 'force-dynamic'

export default async function AdminAuditPage() {
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

  const { data: logs } = await supabase
    .from('admin_audit_log')
    .select(`
      id, action, entity_type, entity_id, payload, created_at,
      actor:members!admin_audit_log_actor_id_fkey(id, full_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <>
      <AdminAuditClient logs={(logs ?? []) as any} />
    </>
  )
}

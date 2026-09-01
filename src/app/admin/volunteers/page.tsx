import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AdminVolunteersClient } from './AdminVolunteersClient'

export const dynamic = 'force-dynamic'

export default async function AdminVolunteersPage() {
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

  const { data: applications } = await supabase
    .from('volunteer_applications')
    .select(`
      id, status, motivation, hours_available, skills, created_at,
      member:members(id, full_name, email, avatar_url),
      event:events(id, title, slug, starts_at)
    `)
    .order('created_at', { ascending: false })

  return (
    <>
      <AdminVolunteersClient applications={(applications ?? []) as any} />
    </>
  )
}

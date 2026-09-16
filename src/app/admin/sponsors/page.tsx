import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AdminSponsorsClient } from './AdminSponsorsClient'

export const dynamic = 'force-dynamic'

export default async function AdminSponsorsPage() {
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

  const { data: sponsors } = await supabase
    .from('event_sponsors')
    .select(`
      id, tier, amount_cents, logo_url, website_url, description, is_active, created_at,
      event:events(id, title, slug),
      member:members(id, full_name, email)
    `)
    .order('created_at', { ascending: false })

  return (
    <>
      <AdminSponsorsClient sponsors={(sponsors ?? []) as any} />
    </>
  )
}

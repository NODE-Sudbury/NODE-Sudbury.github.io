import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AdminPromoClient } from './AdminPromoClient'

export const dynamic = 'force-dynamic'

export default async function AdminPromoPage() {
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

  const { data: promos } = await supabase
    .from('promo_codes')
    .select(`
      id, code, discount_cents, discount_pct, max_uses, used_count, expires_at, is_active, created_at,
      event:events(id, title)
    `)
    .order('created_at', { ascending: false })

  return (
    <>
      <AdminPromoClient promos={(promos ?? []) as any} />
    </>
  )
}

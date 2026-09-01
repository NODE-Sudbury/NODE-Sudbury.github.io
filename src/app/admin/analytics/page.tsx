import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { AnalyticsDashboard } from './AnalyticsDashboard'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
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
    .select('role')
    .eq('id', session.user.id)
    .single()
  if (!member || !['board', 'admin'].includes(member.role)) redirect('/dashboard')

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/admin/analytics`,
    { cache: 'no-store', headers: { cookie: cookieStore.toString() } }
  ).then(r => r.json()).catch(() => ({ summary: null, events: [] }))

  return (
    <>
      <AnalyticsDashboard summary={res.summary ?? {
        published_events: 0,
        total_events: 0,
        confirmed_registrations: 0,
        total_registrations: 0,
        member_count: 0,
        total_revenue_cents: 0,
      }} events={res.events ?? []} />
    </>
  )
}

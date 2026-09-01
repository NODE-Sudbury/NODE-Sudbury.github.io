import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import LogisticsAdmin from './LogisticsAdmin'

export const dynamic = 'force-dynamic'

export default async function LogisticsPage({ params }: { params: { id: string } }) {
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

  if (member?.role !== 'board' && member?.role !== 'admin') redirect('/dashboard')

  return <LogisticsAdmin eventId={params.id} />
}

import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import TiersClient from './TiersClient'

export const dynamic = 'force-dynamic'

export default async function TiersPage({ params }: { params: { id: string } }) {
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

  if (!member || !['board', 'admin', 'super_admin'].includes(member.role)) {
    redirect('/dashboard')
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: event } = await db
    .from('events')
    .select('id, title')
    .eq('id', params.id)
    .single()

  if (!event) notFound()

  const { data: tiers } = await db
    .from('ticket_tiers')
    .select('*')
    .eq('event_id', params.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  return (
    <TiersClient
      eventId={params.id}
      eventTitle={event.title}
      initialTiers={tiers ?? []}
    />
  )
}

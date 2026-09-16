export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { EditEventClient } from './EditEventClient'

export default async function EditEventPage({ params }: { params: { id: string } }) {
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

  // Use service role client so RLS does not block draft events
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const [{ data: event }, { data: locations }, { data: hackathonEvents }, { data: series }] = await Promise.all([
    db
      .from('events')
      .select('*')
      .eq('id', params.id)
      .single(),
    db
      .from('event_locations')
      .select('id, name')
      .order('name'),
    db
      .from('events')
      .select('id, title, starts_at')
      .eq('type', 'hackathon')
      .neq('id', params.id)
      .in('status', ['draft', 'published'])
      .order('starts_at', { ascending: false }),
    db
      .from('event_series')
      .select('id, name')
      .eq('is_active', true)
      .order('name'),
  ])

  if (!event) notFound()

  return (
    <div className="max-w-2xl">
      <EditEventClient event={event as any} locations={locations ?? []} hackathonEvents={hackathonEvents ?? []} series={series ?? []} />
    </div>
  )
}

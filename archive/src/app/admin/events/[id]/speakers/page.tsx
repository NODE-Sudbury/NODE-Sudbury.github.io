import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import SpeakersAdmin from './SpeakersAdmin'

export const dynamic = 'force-dynamic'

export default async function SpeakersPage({ params }: { params: { id: string } }) {
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

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: event } = await db.from('events').select('id, title').eq('id', params.id).single()
  if (!event) notFound()

  const [{ data: speakers }, { data: mentors }] = await Promise.all([
    db.from('event_speakers').select('*').eq('event_id', params.id).order('display_order'),
    db.from('event_mentors').select('*').eq('event_id', params.id).order('sort_order'),
  ])

  return <SpeakersAdmin eventId={params.id} eventTitle={event.title} initialSpeakers={speakers ?? []} initialMentors={mentors ?? []} />
}

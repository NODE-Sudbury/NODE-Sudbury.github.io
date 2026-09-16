import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import BracketAdmin from './BracketAdmin'

export const dynamic = 'force-dynamic'

export default async function BracketAdminPage({ params }: { params: { eventId: string } }) {
  const cookieStore = cookies()
    const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase.from('members').select('role').eq('id', user.id).single()
  if (member?.role !== 'board') redirect('/dashboard')

  const { data: event } = await supabase
    .from('events')
    .select('id, title, hackathon_finals_event_id')
    .eq('id', params.eventId)
    .single()
  if (!event) redirect('/admin')

  // Check if this is a finals event (another hackathon links to it)
  const { data: kickoffEvent } = await supabase
    .from('events')
    .select('id, title')
    .eq('hackathon_finals_event_id', params.eventId)
    .maybeSingle()

  const { data: rounds } = await supabase
    .from('hackathon_rounds')
    .select('*, hackathon_round_teams(*, hackathon_teams(id, name))')
    .eq('event_id', params.eventId)
    .order('round_order')

  return <BracketAdmin event={event} rounds={rounds ?? []} kickoffEvent={kickoffEvent ?? null} />
}

import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import BracketClient from './BracketClient'

export const dynamic = 'force-dynamic'

export default async function BracketPage({ params }: { params: { eventId: string } }) {
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

  const { data: event } = await supabase
    .from('events')
    .select('id, title, slug')
    .eq('id', params.eventId)
    .single()

  if (!event) notFound()

  const { data: rounds } = await supabase
    .from('hackathon_rounds')
    .select(`
      id, name, round_order, status, max_advancing, starts_at, ends_at,
      hackathon_round_teams (
        score, seed, advanced, team_id,
        hackathon_teams ( id, name )
      )
    `)
    .eq('event_id', params.eventId)
    .order('round_order')

  return (
    <div className="min-h-screen bg-[#0b1120] text-[#d8e3f0] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <p className="text-sm text-[#38bdf8] font-semibold uppercase tracking-widest mb-1">Bracket</p>
          <h1 className="text-2xl font-bold">{event.title}</h1>
        </div>
        <BracketClient rounds={rounds ?? []} eventId={params.eventId} />
      </div>
    </div>
  )
}

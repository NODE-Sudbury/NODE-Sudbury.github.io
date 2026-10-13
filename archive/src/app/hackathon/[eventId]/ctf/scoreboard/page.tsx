import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import ScoreboardClient from './ScoreboardClient'

export const dynamic = 'force-dynamic'

export default async function ScoreboardPage({ params }: { params: { eventId: string } }) {
  const { eventId } = params

  const { data: event } = await supabase
    .from('events')
    .select('id, title, slug, type, status')
    .eq('id', eventId)
    .in('type', ['hackathon', 'ctf'])
    .single()

  if (!event) notFound()

  return (
    <ScoreboardClient
      eventId={event.id}
      eventTitle={event.title}
    />
  )
}
